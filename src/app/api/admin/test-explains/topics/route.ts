import { NextResponse } from 'next/server';
import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import type { ExplainTopicSetRef, QuestionTopicOption } from '@/lib/test-explain-topics';

export const dynamic = 'force-dynamic';

// หน้าสอบเทียบหัวข้อด้วย TRIM เท่านั้น (normalizeTopic) — ที่นี่จึงจัดกลุ่มด้วย TRIM ให้ตรงกัน
// ไม่งั้น " Present Simple" กับ "Present Simple" จะกลายเป็นคนละหัวข้อ
const TOPIC_EXPR = sql<string>`TRIM(${questions.grammarTopic})`;
const HAS_TOPIC = sql`${questions.grammarTopic} IS NOT NULL AND TRIM(${questions.grammarTopic}) <> ''`;

/** GET /api/admin/test-explains/topics — หัวข้อที่มีข้อสอบจริง + ชุดที่ใช้แต่ละหัวข้อ */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const topicCounts = await db
      .select({ grammarTopic: TOPIC_EXPR, questionCount: count() })
      .from(questions)
      .where(HAS_TOPIC)
      .groupBy(TOPIC_EXPR)
      .orderBy(asc(TOPIC_EXPR));

    // ชุดข้อสอบที่อ้างถึงหัวข้อนั้น ๆ — ให้แอดมินเห็นว่าเนื้อหาจะถูกใช้ที่ชุดไหน
    const topicSets = await db
      .select({ grammarTopic: TOPIC_EXPR, id: testSets.id, name: testSets.name })
      .from(questions)
      .innerJoin(testSetQuestions, eq(testSetQuestions.questionId, questions.id))
      .innerJoin(testSets, eq(testSets.id, testSetQuestions.testSetId))
      .where(HAS_TOPIC)
      .groupBy(TOPIC_EXPR, testSets.id, testSets.name, testSets.orderIndex)
      .orderBy(asc(testSets.orderIndex), asc(testSets.id));

    const setsByTopic = new Map<string, ExplainTopicSetRef[]>();
    for (const row of topicSets) {
      const ref: ExplainTopicSetRef = { id: row.id, name: row.name };
      const list = setsByTopic.get(row.grammarTopic);
      if (list) list.push(ref);
      else setsByTopic.set(row.grammarTopic, [ref]);
    }

    const data: QuestionTopicOption[] = topicCounts.map((topic) => ({
      ...topic,
      testSets: setsByTopic.get(topic.grammarTopic) ?? [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[admin/test-explains/topics] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch question topics' }, { status: 500 });
  }
}
