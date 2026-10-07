import { and, asc, eq, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { questions, testExplains, testSetQuestions } from '@/db/schema';
import type { LessonSection } from '@/lib/lesson-sections';
import type { TestSetQuestionLike } from '@/lib/test-set-slots';
import { buildTopicRuns, type TopicRun } from '@/lib/test-set-topics';

export interface SectionExplain {
  id: number;
  grammarTopic: string;
  title: string;
  intro: string | null;
  sections: LessonSection[];
  tip: string | null;
}

const explainColumns = {
  id: testExplains.id,
  grammarTopic: testExplains.grammarTopic,
  title: testExplains.title,
  intro: testExplains.intro,
  sections: testExplains.sections,
  tip: testExplains.tip,
};

/**
 * เนื้อหา Explain ทุกอันที่แอดมินผูกไว้กับชุดข้อสอบนี้ (`test_set_ids`) — เฉพาะฉบับที่เผยแพร่แล้ว
 *
 * หนึ่งเรื่องมีได้หนึ่งอัน เพราะ `test_explains.grammar_topic` เป็น UNIQUE ดังนั้น
 * "ชุดหนึ่งมีได้หลายเรื่อง" = "ชุดหนึ่งมี explain ได้หลายอัน" โดยคีย์คือ grammarTopic
 * ใช้ `explainsByTopic()` เพื่อจัดเป็น map ตามเรื่อง แล้วเด้งทีละเรื่องตอนผู้เรียนขึ้นเรื่องใหม่
 */
export async function fetchExplainsForSet(setId: number): Promise<SectionExplain[]> {
  const rows = await db
    .select(explainColumns)
    .from(testExplains)
    .where(
      and(
        eq(testExplains.isPublished, true),
        sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`,
      ),
    )
    .orderBy(asc(testExplains.id));

  return rows.map((row) => ({ ...row, sections: (row.sections ?? []) as LessonSection[] }));
}

/** จัด explain เป็น map คีย์ตาม grammarTopic (trim) สำหรับเด้งรายเรื่องในหน้าสอบ */
export function explainsByTopic(explains: SectionExplain[]): Record<string, SectionExplain> {
  return Object.fromEntries(explains.map((explain) => [explain.grammarTopic.trim(), explain]));
}

/**
 * ลำดับ "ช่วงเรื่อง" ของชุดตามที่ผู้เรียนจะเจอจริง (เรียงตาม order_index ของข้อสอบ)
 * ใช้ตัดสินว่าเป็นชุดรวมหลายเรื่องหรือไม่ — ซึ่งเป็นตัวกำหนดว่าจะเปิดหน้า /explain
 * ระดับชุด (ชุดเรื่องเดียว) หรือปล่อยให้เด้ง intro+explain รายเรื่องตอนสอบ (ชุดรวม)
 */
export async function fetchSetTopicRuns(setId: number): Promise<TopicRun[]> {
  const rows = await db
    .select({
      id: questions.id,
      testTypeId: questions.testTypeId,
      correctAnswer: questions.correctAnswer,
      article: questions.article,
      tapExercise: questions.tapExercise,
      grammarTopic: questions.grammarTopic,
    })
    .from(testSetQuestions)
    .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
    .where(eq(testSetQuestions.testSetId, setId))
    .orderBy(asc(testSetQuestions.orderIndex));

  // `article` เป็น jsonb ที่ drizzle ไม่รู้รูปร่าง — ระบุตรงขอบเขต DB เพื่อให้คำนวณ slot
  // ของบทความ (ช่องว่าง = หนึ่ง slot) ได้เหมือนตอนขยายชุดในหน้าสอบ
  return buildTopicRuns(rows.map((row) => ({ ...row, article: row.article as TestSetQuestionLike['article'] })));
}

/** แคชชั้นข้อมูลแบบเดียวกับหน้า /tests — revalidate 300 วินาที (คีย์รวม setId อัตโนมัติ) */
export const getCachedExplainsForSet = unstable_cache(
  async (setId: number): Promise<SectionExplain[]> => fetchExplainsForSet(setId),
  ['explains-for-test-set'],
  { revalidate: 300, tags: ['test-explains'] },
);

export const getCachedSetTopicRuns = unstable_cache(
  async (setId: number): Promise<TopicRun[]> => fetchSetTopicRuns(setId),
  ['test-set-topic-runs'],
  { revalidate: 300, tags: ['test-explains', 'sections'] },
);
