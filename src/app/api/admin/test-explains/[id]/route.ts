import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { lessonSectionsHaveContent, normalizeLessonSections } from '@/lib/lesson-sections';
import { PUBLISHED_STATUS, resolveContentStatus } from '@/lib/explain-visibility';

/** รวม grammarTopic (แบบเดิม) + grammarTopics (หลายหัวข้อ) เป็นรายการหัวข้อ — ตัวแรกคือหัวข้อหลัก */
function resolveTopics(payload: {
  grammarTopic?: string;
  grammarTopics?: string[];
}): string[] {
  const topics = [...(payload.grammarTopics ?? []), ...(payload.grammarTopic ? [payload.grammarTopic] : [])]
    .map((topic) => topic.trim())
    .filter(Boolean);
  return [...new Set(topics)].slice(0, 50);
}

/** หัวข้อที่ถูกเนื้อหาอื่น (ไม่ใช่ตัวที่กำลังแก้) ใช้อยู่แล้ว */
async function findDuplicateTopic(topics: string[], excludeId: number): Promise<string | null> {
  if (!topics.length) return null;
  // jsonb `?` เทียบว่า grammar_topics (jsonb array) มีหัวข้อนั้นหรือไม่ — ทำต่อหัวข้อแล้ว OR รวม
  const overlapCondition = or(
    inArray(testExplains.grammarTopic, topics),
    ...topics.map((topic) => sql`${testExplains.grammarTopics} ? ${topic}`),
  );
  const [conflict] = await db
    .select({ id: testExplains.id, grammarTopic: testExplains.grammarTopic })
    .from(testExplains)
    .where(and(overlapCondition, ne(testExplains.id, excludeId)))
    .limit(1);
  return conflict ? conflict.grammarTopic : null;
}

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await props.params;
  const explainId = Number(id);
  if (!Number.isInteger(explainId) || explainId <= 0) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const parsed = z.object({
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
      // สถานะเนื้อหา (draft/review/published/hidden) — ยังรับ isPublished แบบเดิมได้
      status: z.string().optional(),
      isPublished: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: 'กรุณาระบุ grammarTopic, title และ sections ให้ถูกต้อง' }, { status: 400 });
    const grammarTopics = resolveTopics(parsed.data);
    if (!grammarTopics.length) return NextResponse.json({ success: false, error: 'กรุณาระบุ grammarTopic อย่างน้อย 1 หัวข้อ' }, { status: 400 });
    const duplicateTopic = await findDuplicateTopic(grammarTopics, explainId);
    if (duplicateTopic) {
      return NextResponse.json({ success: false, error: `หัวข้อ "${duplicateTopic}" ถูกเนื้อหาอธิบายอื่นใช้อยู่แล้ว — หัวข้อเดียวเชื่อมได้เนื้อหาเดียว` }, { status: 409 });
    }
    const sections = normalizeLessonSections(parsed.data.sections);
    if (!lessonSectionsHaveContent(sections)) return NextResponse.json({ success: false, error: 'ต้องมีเนื้อหา explain อย่างน้อย 1 ส่วน' }, { status: 400 });
    const status = resolveContentStatus(parsed.data);
    if (!status) return NextResponse.json({ success: false, error: 'สถานะไม่ถูกต้อง — ใช้ draft, review, published หรือ hidden' }, { status: 400 });
    // Mini Quiz ตรวจทุก type — ฝังท้ายการ์ดเนื้อหาของก็ต้องตอบได้ครบเหมือนการ์ด practice
    if (status === PUBLISHED_STATUS && sections.some((section) => section.practice?.questions.some((question) => question.sentence.trim() && (question.options.filter(Boolean).length < 2 || !question.options[question.answerIndex]?.trim())))) {
      return NextResponse.json({ success: false, error: 'Mini Quiz ทุกข้อต้องมีตัวเลือกอย่างน้อย 2 ข้อและระบุคำตอบที่ถูกต้อง' }, { status: 400 });
    }
    const [updated] = await db.update(testExplains).set({
      grammarTopic: grammarTopics[0],
      grammarTopics,
      title: parsed.data.title,
      intro: parsed.data.intro?.trim() || null,
      sections,
      tip: parsed.data.tip?.trim() || null,
      // เก็บแบบ unique + sorted กันค่าซ้ำจาก UI
      testSetIds: [...new Set(parsed.data.testSetIds ?? [])].sort((a, b) => a - b),
      status,
      updatedAt: new Date(),
    }).where(eq(testExplains.id, explainId)).returning();
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[admin/test-explains/id] PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update explain content' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await props.params;
  const explainId = Number(id);
  if (!Number.isInteger(explainId) || explainId <= 0) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  try {
    const [deleted] = await db.delete(testExplains).where(eq(testExplains.id, explainId)).returning({ id: testExplains.id });
    if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/test-explains/id] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete explain content' }, { status: 500 });
  }
}
