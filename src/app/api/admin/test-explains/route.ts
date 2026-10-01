import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions, testExplains } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { normalizeLessonSections } from '@/lib/lesson-sections';

export const dynamic = 'force-dynamic';

const explainPayloadSchema = z.object({
  grammarTopic: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  intro: z.string().optional().nullable(),
  sections: z.array(z.unknown()).min(1),
  tip: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
});

const parsePayload = (body: unknown) => {
  const parsed = explainPayloadSchema.safeParse(body);
  if (!parsed.success) throw new Error('กรุณาระบุ grammarTopic, title และ sections ให้ถูกต้อง');
  const sections = normalizeLessonSections(parsed.data.sections);
  const hasContent = sections.some((section) => section.heading?.trim() || section.body?.trim() || section.chip?.trim() || section.description?.trim() || section.rows?.some((row) => row.left.trim() || row.right?.trim()) || section.examples?.some((example) => example.en.trim()) || section.practice?.questions?.some((question) => question.sentence.trim()));
  if (!hasContent) throw new Error('ต้องมีเนื้อหา explain อย่างน้อย 1 ส่วน');
  if (parsed.data.isPublished && sections.some((section) => section.type === 'practice' && section.practice?.questions.some((question) => question.sentence.trim() && (question.options.filter(Boolean).length < 2 || !question.options[question.answerIndex]?.trim())))) {
    throw new Error('Mini Quiz ทุกข้อต้องมีตัวเลือกอย่างน้อย 2 ข้อและระบุคำตอบที่ถูกต้อง');
  }
  return {
    grammarTopic: parsed.data.grammarTopic,
    title: parsed.data.title,
    intro: parsed.data.intro?.trim() || null,
    sections,
    tip: parsed.data.tip?.trim() || null,
    isPublished: parsed.data.isPublished ?? false,
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
    return NextResponse.json({ success: true, data: rows.map((row) => ({ ...row, questionCount: countByTopic.get(row.grammarTopic) ?? 0 })) });
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
    const [created] = await db.insert(testExplains).values(payload).returning();
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create explain content';
    const duplicate = message.includes('duplicate key') || message.includes('unique constraint');
    const validation = error instanceof z.ZodError || message.startsWith('กรุณาระบุ') || message.startsWith('ต้องมี') || message.startsWith('Mini Quiz');
    const status = duplicate ? 409 : validation ? 400 : 500;
    if (status === 500) console.error('[admin/test-explains] POST error:', error);
    return NextResponse.json({ success: false, error: status === 409 ? 'มีเนื้อหาอธิบายสำหรับ grammarTopic นี้แล้ว' : message }, { status });
  }
}
