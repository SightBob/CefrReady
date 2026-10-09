import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, count, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions, testExplains } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { lessonSectionsHaveContent, normalizeLessonSections } from '@/lib/lesson-sections';
import { PUBLISHED_STATUS, resolveContentStatus } from '@/lib/explain-visibility';

export const dynamic = 'force-dynamic';

const explainPayloadSchema = z.object({
  // หัวข้อหลัก (ตัวแรก) — รับแบบเดิมได้ หรือส่ง grammarTopics หลายหัวข้อแทน
  grammarTopic: z.string().trim().min(1).max(200).optional(),
  // หัวข้อทั้งหมดที่เนื้อหานี้เชื่อมกับข้อสอบ — หัวข้อแรกคือหัวข้อหลัก
  grammarTopics: z.array(z.string().trim().min(1).max(200)).min(1).max(50).optional(),
  title: z.string().trim().min(1).max(200),
  intro: z.string().optional().nullable(),
  sections: z.array(z.unknown()).min(1),
  tip: z.string().optional().nullable(),
  // ชุดข้อสอบที่ผูกเนื้อหานี้ไว้ (แสดง overlay อัตโนมัติเมื่อเริ่มทำชุด)
  testSetIds: z.array(z.number().int().positive()).max(200).optional(),
  // สถานะเนื้อหา (draft/review/published/hidden) — แทน isPublished เดิมที่ยังรับได้เพื่อความเข้ากันได้
  status: z.string().optional(),
  isPublished: z.boolean().optional(),
});

/** รวม grammarTopic (แบบเดิม) + grammarTopics (หลายหัวข้อ) เป็นรายการหัวข้อ — ตัวแรกคือหัวข้อหลัก */
function resolveTopics(payload: z.infer<typeof explainPayloadSchema>): string[] {
  const topics = [...(payload.grammarTopics ?? []), ...(payload.grammarTopic ? [payload.grammarTopic] : [])]
    .map((topic) => topic.trim())
    .filter(Boolean);
  return [...new Set(topics)].slice(0, 50);
}

/** หัวข้อที่ถูกเนื้อหาอื่นใช้อยู่แล้ว (หัวข้อหลักหรือหัวข้อรอง) — กันข้อสอบหัวข้อเดียวเด้งสองเนื้อหา */
async function findDuplicateTopicUser(topics: string[], excludeId?: number): Promise<string | null> {
  if (!topics.length) return null;
  // jsonb `?` เทียบว่า grammar_topics (jsonb array) มีหัวข้อนั้นหรือไม่ — ทำต่อหัวข้อแล้ว OR รวม
  const overlapCondition = or(
    inArray(testExplains.grammarTopic, topics),
    ...topics.map((topic) => sql`${testExplains.grammarTopics} ? ${topic}`),
  );
  const [conflict] = await db
    .select({ id: testExplains.id, grammarTopic: testExplains.grammarTopic })
    .from(testExplains)
    .where(excludeId ? and(overlapCondition, ne(testExplains.id, excludeId)) : overlapCondition)
    .limit(1);
  return conflict ? conflict.grammarTopic : null;
}

const parsePayload = (body: unknown) => {
  const parsed = explainPayloadSchema.safeParse(body);
  if (!parsed.success) throw new Error('กรุณาระบุ grammarTopic, title และ sections ให้ถูกต้อง');
  const grammarTopics = resolveTopics(parsed.data);
  if (!grammarTopics.length) throw new Error('กรุณาระบุ grammarTopic, title และ sections ให้ถูกต้อง');
  const sections = normalizeLessonSections(parsed.data.sections);
  if (!lessonSectionsHaveContent(sections)) throw new Error('ต้องมีเนื้อหา explain อย่างน้อย 1 ส่วน');
  const status = resolveContentStatus(parsed.data);
  if (!status) throw new Error('สถานะไม่ถูกต้อง — ใช้ draft, review, published หรือ hidden');
  // Mini Quiz ตรวจทุก type — ฝังท้ายการ์ดเนื้อหาของก็ต้องตอบได้ครบเหมือนการ์ด practice
  if (status === PUBLISHED_STATUS && sections.some((section) => section.practice?.questions.some((question) => question.sentence.trim() && (question.options.filter(Boolean).length < 2 || !question.options[question.answerIndex]?.trim())))) {
    throw new Error('Mini Quiz ทุกข้อต้องมีตัวเลือกอย่างน้อย 2 ข้อและระบุคำตอบที่ถูกต้อง');
  }
  return {
    grammarTopic: grammarTopics[0],
    grammarTopics,
    title: parsed.data.title,
    intro: parsed.data.intro?.trim() || null,
    sections,
    tip: parsed.data.tip?.trim() || null,
    // เก็บแบบ unique + sorted กันค่าซ้ำจาก UI
    testSetIds: [...new Set(parsed.data.testSetIds ?? [])].sort((a, b) => a - b),
    status,
  };
};

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const [rows, topicCounts] = await Promise.all([
      db.select().from(testExplains).orderBy(asc(testExplains.grammarTopic)),
      db.select({ grammarTopic: sql<string>`TRIM(${questions.grammarTopic})`, questionCount: count() })
        .from(questions).where(sql`${questions.grammarTopic} IS NOT NULL AND TRIM(${questions.grammarTopic}) <> ''`)
        .groupBy(sql`TRIM(${questions.grammarTopic})`),
    ]);
    const countByTopic = new Map(topicCounts.map((item) => [item.grammarTopic, item.questionCount]));
    // จำนวนข้อสอบของแต่ละเนื้อหา = รวมทุกหัวข้อที่เนื้อหานั้นเชื่อมไว้ (หัวข้อซ้ำระหว่างหัวข้อหลัก/รอง นับครั้งเดียว)
    return NextResponse.json({
      success: true,
      data: rows.map((row) => {
        const topics = (row.grammarTopics?.length ? row.grammarTopics : [row.grammarTopic]).map((topic) => topic.trim());
        const questionCount = new Set(topics).size
          ? [...new Set(topics)].reduce((sum, topic) => sum + (countByTopic.get(topic) ?? 0), 0)
          : 0;
        return { ...row, questionCount };
      }),
    });
  } catch (error) {
    console.error('[admin/test-explains] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch explain content' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const payload = parsePayload(await request.json());
    const duplicateTopic = await findDuplicateTopicUser(payload.grammarTopics);
    if (duplicateTopic) {
      return NextResponse.json({ success: false, error: `หัวข้อ "${duplicateTopic}" ถูกเนื้อหาอธิบายอื่นใช้อยู่แล้ว — หัวข้อเดียวเชื่อมได้เนื้อหาเดียว` }, { status: 409 });
    }
    const [created] = await db.insert(testExplains).values(payload).returning();
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create explain content';
    const duplicate = message.includes('duplicate key') || message.includes('unique constraint');
    const validation = error instanceof z.ZodError || message.startsWith('กรุณาระบุ') || message.startsWith('ต้องมี') || message.startsWith('Mini Quiz') || message.startsWith('สถานะ');
    const status = duplicate ? 409 : validation ? 400 : 500;
    if (status === 500) console.error('[admin/test-explains] POST error:', error);
    return NextResponse.json({ success: false, error: status === 409 ? 'มีเนื้อหาอธิบายสำหรับ grammarTopic นี้แล้ว' : message }, { status });
  }
}
