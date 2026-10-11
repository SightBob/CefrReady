import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { isSectionInMaintenance } from '@/lib/test-section-maintenance';
import { expandTestSetSlots, type TapExerciseData, type TestSetQuestionLike } from '@/lib/test-set-slots';
import type { Article, ConversationLine } from '@/types/test';

/**
 * ชุดข้อสอบ demo แบบ "ปนทุกทักษะ" — แหล่งความจริงเดียวของ flow โหมดตัวอย่างใหม่
 * (/demo/intro → /demo/exam)
 *
 * ลำดับข้อใช้ demoOrder ที่แอดมินตั้งใน /admin/questions เรียงเป็นชุดเดียวทั้งชุด
 * (เลขน้อยก่อน · ข้อที่ยังไม่ตั้งเลขไปต่อท้าย · เท่ากันเทียบด้วย id) ตรงกับที่
 * /demo/[ทักษะ] แต่ละหน้าใช้ — ไม่สลับทักษะแบบ round-robin อีกแล้ว เพราะทำให้
 * ลำดับที่แอดมินตั้งไว้ไม่ตรงกับลำดับที่ผู้เรียนเห็นในหน้า /demo/exam
 */

export const DEMO_TEST_TYPES = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'] as const;
export const DEMO_MAX_TOTAL = 10;

export interface DemoQuestionRow extends TestSetQuestionLike {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  cefrLevel: string;
  difficulty: string | null;
  orderIndex: number | null;
  conversation: ConversationLine[] | null;
  audioUrl: string | null;
  transcript: string | null;
  article: Article | null;
  correctAnswer: string | null;
  explanation: string | null;
  tapExercise: TapExerciseData | null;
}

/**
 * ชุด demo ผสมทุกทักษะ — เรียงตาม demoOrder ที่แอดมินกำหนดทั้งชุด แล้วตัดที่
 * DEMO_MAX_TOTAL · ทักษะที่แอดมินปิดปรับปรุง (maintenance) จะไม่มีข้อออกมา
 * (เรียงใน SQL เพราะต้องเรียงก่อน limit ไม่งั้นจะได้ 10 ข้อแบบสุ่มจากทั้งคลัง)
 */
export async function fetchMixedDemoQuestions(): Promise<DemoQuestionRow[]> {
  const activeTypes = (
    await Promise.all(
      DEMO_TEST_TYPES.map(async (type) => ((await isSectionInMaintenance(type)) ? null : type))
    )
  ).filter((type): type is (typeof DEMO_TEST_TYPES)[number] => type !== null);

  if (activeTypes.length === 0) return [];

  return (await db
    .select({
      id: questions.id,
      testTypeId: questions.testTypeId,
      questionText: questions.questionText,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      cefrLevel: questions.cefrLevel,
      difficulty: questions.difficulty,
      orderIndex: questions.orderIndex,
      conversation: questions.conversation,
      audioUrl: questions.audioUrl,
      transcript: questions.transcript,
      article: questions.article,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      tapExercise: questions.tapExercise,
    })
    .from(questions)
    .where(and(inArray(questions.testTypeId, activeTypes), eq(questions.isDemo, true)))
    .orderBy(sql`${questions.demoOrder} ASC NULLS LAST`, asc(questions.id))
    .limit(DEMO_MAX_TOTAL)) as DemoQuestionRow[];
}

/** จำนวน slot ทั้งหมดของชุด demo (MC/tap item/cloze blank นับแบบเดียวกับชุดจริง) */
export function countTestSetSlots(rows: TestSetQuestionLike[]): number {
  return expandTestSetSlots(rows).length;
}
