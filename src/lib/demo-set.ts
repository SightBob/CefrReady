import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { isSectionInMaintenance } from '@/lib/test-section-maintenance';
import { expandTestSetSlots, type TapExerciseData, type TestSetQuestionLike } from '@/lib/test-set-slots';
import type { Article, ConversationLine } from '@/types/test';

/**
 * ชุดข้อสอบ demo แบบ "ปนทุกทักษะ" — แหล่งความจริงเดียวของ flow โหมดตัวอย่างใหม่
 * (/demo/intro → /demo/exam) ใช้โครงชุดข้อสอบที่แอดมินกำหนดเหมือนชุดจริง
 * (is_demo + demoOrder + tap/article slots) จากทั้ง 4 ทักษะมาผสมกันแบบ
 * round-robin เป็นชุดเดียว
 */

export const DEMO_TEST_TYPES = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'] as const;
export const DEMO_MAX_PER_TYPE = 10;
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

/** ดึงข้อ demo ของทักษะเดียว (เรียงตาม demoOrder ที่แอดมินกำหนด) */
async function fetchDemoPool(testTypeName: string): Promise<DemoQuestionRow[]> {
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
    .where(and(eq(questions.testTypeId, testTypeName), eq(questions.isDemo, true)))
    .orderBy(sql`${questions.demoOrder} ASC NULLS LAST`, asc(questions.id))
    .limit(DEMO_MAX_PER_TYPE)) as DemoQuestionRow[];
}

/**
 * ชุด demo ผสมทุกทักษะ: หมุนวนทักษะทีละข้อ (round-robin) เพื่อให้ชุดผสมจริง
 * ไม่รวมเป็นก้อน — ทักษะที่แอดมินยังไม่ได้ตั้งข้อ demo จะถูกข้ามไปโดยอัตโนมัติ
 */
export async function fetchMixedDemoQuestions(): Promise<DemoQuestionRow[]> {
  // ทักษะที่แอดมินปิดปรับปรุง (maintenance) ต้องไม่มีข้อออกจากชุด demo
  const activeTypes = (
    await Promise.all(
      DEMO_TEST_TYPES.map(async (type) => ((await isSectionInMaintenance(type)) ? null : type))
    )
  ).filter((type): type is (typeof DEMO_TEST_TYPES)[number] => type !== null);

  const pools = await Promise.all(activeTypes.map((type) => fetchDemoPool(type)));

  const mixed: DemoQuestionRow[] = [];
  let cursor = 0;
  while (mixed.length < DEMO_MAX_TOTAL && pools.some((pool) => pool.length > 0)) {
    const pool = pools[cursor % pools.length];
    cursor += 1;
    const next = pool.shift();
    if (next) mixed.push(next);
  }
  return mixed;
}

/** จำนวน slot ทั้งหมดของชุด demo (MC/tap item/cloze blank นับแบบเดียวกับชุดจริง) */
export function countTestSetSlots(rows: TestSetQuestionLike[]): number {
  return expandTestSetSlots(rows).length;
}
