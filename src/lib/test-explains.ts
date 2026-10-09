import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { questions, testExplains, testSetQuestions, testSets } from '@/db/schema';
import type { LessonSection } from '@/lib/lesson-sections';
import { parseContentStatus, toLearnerExplain, toPreviewExplain, type ContentStatus } from '@/lib/explain-visibility';
import type { TestSetQuestionLike } from '@/lib/test-set-slots';
import { buildTopicRuns, normalizeTopic, type TopicRun } from '@/lib/test-set-topics';

export interface SectionExplain {
  id: number;
  grammarTopic: string;
  /** หัวข้อทั้งหมดที่เนื้อหานี้เชื่อมกับข้อสอบ (ตัวแรก = หัวข้อหลักตาม `grammarTopic`) */
  grammarTopics: string[];
  title: string;
  intro: string | null;
  sections: LessonSection[];
  tip: string | null;
  status: ContentStatus;
}

const explainColumns = {
  id: testExplains.id,
  grammarTopic: testExplains.grammarTopic,
  grammarTopics: testExplains.grammarTopics,
  title: testExplains.title,
  intro: testExplains.intro,
  sections: testExplains.sections,
  tip: testExplains.tip,
  status: testExplains.status,
};

/**
 * เนื้อหา Explain ทุกอันที่แอดมินผูกไว้กับชุดข้อสอบนี้ (`test_set_ids`) — เฉพาะฉบับที่เผยแพร่แล้ว
 * และตัดส่วนที่ยังเป็นฉบับร่างออก (แอดมินดูของที่ยังไม่เสร็จได้จากหน้า /admin/test-explains)
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
        eq(testExplains.status, 'published'),
        sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`,
      ),
    )
    .orderBy(asc(testExplains.id));

  // เรื่องที่ผู้เรียนยังไม่เห็นเลย (ทุกส่วนเป็นฉบับร่าง) จะถูกตัดทิ้ง ไม่ให้เห็นหน้าเปล่า
  return rows.flatMap((row) => {
    const learner = toLearnerExplain({
      ...row,
      status: parseContentStatus(row.status),
      sections: (row.sections ?? []) as LessonSection[],
    });
    return learner ? [learner] : [];
  });
}

/** ชุดข้อสอบที่แอดมินควรเปิดดู “หน้าทำข้อสอบจริง” ของเนื้อหาอันหนึ่ง */
export interface ExplainQuizTarget {
  setId: number;
  sectionId: string;
  name: string;
}

const quizTargetColumns = {
  setId: testSets.id,
  sectionId: testSets.sectionId,
  name: testSets.name,
};

/**
 * หาชุดข้อสอบที่เนื้อหานี้จะถูกใช้จริง เพื่อเปิดหน้าทำข้อสอบจากหน้าพรีวิวของแอดมิน
 *
 * ลำดับความสำคัญ:
 *  1. ชุดที่แอดมินผูกไว้ (`test_explains.test_set_ids`) — ของจริงที่ผู้เรียนจะเจอ
 *  2. ชุดที่มีข้อสอบใช้ grammarTopic เดียวกัน — เคสปกติของเนื้อหาที่ยังไม่ได้ผูกชุด
 *     (ผู้เรียนเจอเนื้อหานี้ผ่าน `grammarTopic` ตอนขึ้นเรื่องใหม่ ไม่ใช่ผ่านการผูกชุด)
 *
 * คืน null เมื่อไม่มีข้อสอบข้อใดใช้หัวข้อนี้เลย — ตอนนั้นเปิดหน้าสอบไปก็ไม่มีอะไรให้ดู
 */
export async function findExplainQuizTarget(options: {
  /** หัวข้อหลัก (ใช้เองได้เมื่อเนื้อหานั้นมีหัวข้อเดียว) */
  grammarTopic?: string;
  /** หัวข้อทั้งหมดของเนื้อหา — ชุดใดมีข้อสอบหัวข้อใดหัวข้อหนึ่งในนี้ก็เปิดได้ */
  grammarTopics?: string[] | null;
  boundSetIds?: number[] | null;
}): Promise<ExplainQuizTarget | null> {
  const boundIds = (options.boundSetIds ?? []).filter((id) => Number.isInteger(id) && id > 0);
  if (boundIds.length) {
    const [bound] = await db
      .select(quizTargetColumns)
      .from(testSets)
      .where(inArray(testSets.id, boundIds))
      .orderBy(asc(testSets.orderIndex))
      .limit(1);
    if (bound) return bound;
  }

  const topics = [...(options.grammarTopics ?? []), ...(options.grammarTopic ? [options.grammarTopic] : [])]
    .map((topic) => normalizeTopic(topic))
    .filter((topic): topic is string => Boolean(topic));
  if (!topics.length) return null;

  const [byTopic] = await db
    .select(quizTargetColumns)
    .from(questions)
    .innerJoin(testSetQuestions, eq(testSetQuestions.questionId, questions.id))
    .innerJoin(testSets, eq(testSets.id, testSetQuestions.testSetId))
    .where(inArray(sql`TRIM(${questions.grammarTopic})`, topics))
    .orderBy(asc(testSets.orderIndex), asc(testSets.id))
    .limit(1);
  return byTopic ?? null;
}

/**
 * โหมดพรีวิวของแอดมิน: เนื้อหา explain **ทุกสถานะ** ที่ผูกกับชุดนี้ (ยังตัดส่วนฉบับร่างออก)
 * ใช้เฉพาะเมื่อผู้เรียกตรวจสิทธิ์ผู้ดูแลแล้ว (ดู `isAdminRequest()`)
 * — ไม่ cache เพราะเป็นมุมมองเฉพาะแอดมินที่ต้องเห็นค่าล่าสุดเสมอ
 */
export async function fetchExplainsForSetPreview(setId: number): Promise<SectionExplain[]> {
  const rows = await db
    .select(explainColumns)
    .from(testExplains)
    .where(sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`)
    .orderBy(asc(testExplains.id));

  return rows.flatMap((row) => {
    const preview = toPreviewExplain({
      ...row,
      status: parseContentStatus(row.status),
      sections: (row.sections ?? []) as LessonSection[],
    });
    return preview ? [preview] : [];
  });
}

/**
 * จัด explain เป็น map คีย์ตาม grammarTopic (trim) สำหรับเด้งรายเรื่องในหน้าสอบ
 *
 * เนื้อหาหนึ่งอันเชื่อมได้หลายหัวข้อ (`grammarTopics`) จึงลง map ทุกหัวข้อที่ตัวเองผูกไว้
 * — ข้อสอบหัวข้อใดก็ได้ในนั้นจะชี้มาที่เนื้อหาเดียวกัน ถ้าหัวข้อเดียวกันถูกผูกไว้กับหลายเนื้อหา
 * (กันไว้ที่ตอนบันทึกแล้ว) ตัวที่เรียงก่อน (id น้อยกว่า) จะชนะ
 */
export function explainsByTopic(explains: SectionExplain[]): Record<string, SectionExplain> {
  const byTopic: Record<string, SectionExplain> = {};
  for (const explain of explains) {
    const topics = explain.grammarTopics?.length ? explain.grammarTopics : [explain.grammarTopic];
    for (const topic of topics) {
      const key = topic.trim();
      if (key && !byTopic[key]) byTopic[key] = explain;
    }
  }
  return byTopic;
}

/** หัวข้อทั้งหมดของ explain รายการเดียว (fallback เป็น grammarTopic เดิมเมื่อยังไม่มี array) */
export function explainTopicsOf(row: { grammarTopic: string; grammarTopics?: string[] | null }): string[] {
  const topics = (row.grammarTopics ?? []).map((topic) => topic.trim()).filter(Boolean);
  return topics.length ? topics : [row.grammarTopic.trim()].filter(Boolean);
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
