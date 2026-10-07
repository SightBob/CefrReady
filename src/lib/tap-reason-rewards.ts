import type { TestSetSlot, TapExerciseData } from './test-set-slots';

/**
 * Tap & Select: "คะแนนเก็บ" จากเหตุผลที่ผู้เรียนเขียนเอง
 *
 * กติกาเดียวที่ทั้งสองฝั่งต้องตรงกัน: **เก็บ/ได้คะแนนเฉพาะข้อย่อยที่ผู้เรียนเขียนเหตุผลจริง**
 * ข้อที่ปล่อยว่างจะไม่ถูกบันทึก (ไม่มีแถว) จึงไม่ถูก admin ให้คะแนน
 */

/** ความยาวเหตุผลสูงสุด — ต้องตรงกับ zod schema ใน /api/tests/submit และ /api/tests/tap-reason */
export const MAX_TAP_REASON_LENGTH = 1500;

/** แถวที่จะ insert ลงตาราง tap_reason_submissions */
export interface TapReasonRow {
  attemptId: number;
  userId: string;
  questionId: number;
  itemIndex: number;
  reason: string;
  isCorrect: boolean;
  createdAt: Date;
}

export interface TapReasonQuestionContext {
  id: number;
  tapExercise: TapExerciseData | null;
}

export interface TapReasonAnswerResult {
  questionId: number;
  /** JSON ของคำตอบที่เก็บไว้ต่อข้อย่อย เช่น {"0":"A","1":"B"} */
  userAnswer: string;
}

export interface CollectTapReasonRowsInput {
  attemptId: number;
  userId: string;
  createdAt: Date;
  results: readonly TapReasonAnswerResult[];
  questions: readonly TapReasonQuestionContext[];
  /** เหตุผลที่ client ส่งมา: questionId → (itemIndex → ข้อความ) */
  clientReasons?: Record<string, Record<string, string>> | null;
}

function parseTapAnswers(userAnswer: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(userAnswer);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, value]) => typeof value === 'string'
    ) as Array<[string, string]>;
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

/**
 * แปลงเหตุผลที่ client ส่งมาเป็นแถวพร้อมบันทึก
 * — ข้ามข้อย่อยที่ไม่มีข้อความ (ไม่เขียน = ไม่มีคะแนน) และข้อย่อยที่ยังไม่ตอบ
 */
export function collectTapReasonRows(input: CollectTapReasonRowsInput): TapReasonRow[] {
  const rows: TapReasonRow[] = [];
  // กันคำตอบซ้ำ (client ส่ง questionId เดิมสองครั้ง) ไม่ให้ insert สองแถวชน unique กันเอง
  const seen = new Set<string>();
  for (const result of input.results) {
    const items = input.questions.find((q) => q.id === result.questionId)?.tapExercise?.items;
    if (!items || items.length === 0) continue;
    const parsedAnswers = parseTapAnswers(result.userAnswer);
    items.forEach((item, itemIndex) => {
      const reason = (
        input.clientReasons?.[String(result.questionId)]?.[String(itemIndex)] ?? ''
      ).trim().slice(0, MAX_TAP_REASON_LENGTH);
      const choice = (parsedAnswers[String(itemIndex)] ?? '').trim();
      if (!reason || !choice) return;
      const dedupeKey = `${result.questionId}:${itemIndex}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      const correctKey = item.correct === 0 ? 'A' : 'B';
      rows.push({
        attemptId: input.attemptId,
        userId: input.userId,
        questionId: result.questionId,
        itemIndex,
        reason,
        isCorrect: choice.toUpperCase() === correctKey,
        createdAt: input.createdAt,
      });
    });
  }
  return rows;
}

/**
 * จัดกลุ่มเหตุผลฝั่ง client ให้เป็น questionId → (itemIndex → ข้อความ)
 * ข้อสอบ Tap ข้อเดียวกันมีหลายข้อย่อยได้ → ต้อง merge ไม่ให้คีย์ทับกัน
 */
export function groupTapReasonsByQuestion(
  entries: Iterable<{ slotIndex: number; reason: string }>,
  slots: readonly TestSetSlot[],
  questions: readonly { id: number }[]
): Record<string, Record<string, string>> | undefined {
  const grouped: Record<string, Record<string, string>> = {};
  for (const { slotIndex, reason } of entries) {
    const trimmed = reason.trim();
    if (!trimmed) continue;
    const slot = slots[slotIndex];
    if (!slot || slot.kind !== 'tap') continue;
    const questionId = questions[slot.questionIndex]?.id;
    if (questionId === undefined) continue;
    const byItem = grouped[String(questionId)] ?? {};
    byItem[String(slot.itemIndex)] = trimmed;
    grouped[String(questionId)] = byItem;
  }
  return Object.keys(grouped).length > 0 ? grouped : undefined;
}
