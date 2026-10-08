import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import type { CoverageQuestion } from '@/lib/explain-coverage';

export const dynamic = 'force-dynamic';

// หน้าสอบเทียบหัวข้อด้วย TRIM เท่านั้น — ที่นี่จึงต้องเทียบแบบเดียวกัน
const TOPIC_EXPR = sql<string>`TRIM(${questions.grammarTopic})`;

/**
 * GET /api/admin/test-explains/topics/[topic]/questions
 *
 * ข้อสอบทั้งหมดของ grammarTopic หนึ่ง ๆ (พร้อมหัวข้อย่อยของแต่ละข้อ) ให้หน้าแก้ไข
 * Explain เอาไปตรวจว่าบทที่กำลังเขียนครอบคลุมทุกข้อในหัวข้อนั้นหรือยัง
 *
 * หมายเหตุ: `params.topic` ถูก decode มาจาก Next แล้ว จึง trim เท่านั้น ไม่ decode ซ้ำ
 */
export async function GET(_request: NextRequest, props: { params: Promise<{ topic: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = await props.params;
  const topic = (params.topic ?? '').trim();
  if (!topic || topic.length > 200) {
    return NextResponse.json({ success: false, error: 'Invalid topic' }, { status: 400 });
  }

  try {
    const rows = await db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        correctAnswer: questions.correctAnswer,
        subTopicGrammar: questions.subTopicGrammar,
      })
      .from(questions)
      .where(eq(TOPIC_EXPR, topic))
      .orderBy(asc(questions.id));

    const data: { topic: string; questions: CoverageQuestion[] } = { topic, questions: rows };
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[admin/test-explains/topics/[topic]/questions] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch topic questions' }, { status: 500 });
  }
}
