import { sql, type SQL } from 'drizzle-orm';
import { questions, userAnswers } from '@/db/schema';

/**
 * คำตอบที่ส่งก่อนโจทย์ถูกแก้ (`questions.stats_cutoff_at`) ไม่ถูกนับในสถิติรวมของแอดมิน
 *
 * ทำไมต้องมี: `user_answers.is_correct` เป็น snapshot ที่คำนวณด้วยเฉลย ณ เวลาที่ตอบ
 * พอแอดมินแก้เฉลย/ตัวเลือก คำตอบเก่าจะถูกนับด้วยความหมายใหม่ (เช่น ตอบ C ซึ่งเคยถูก
 * แต่ตอนนี้เฉลยเป็น A) ทำให้อัตราถูกและ "ข้อที่ตอบผิดบ่อย" เพี้ยน
 *
 * เราไม่แก้และไม่ลบ `user_answers` (เป็นประวัติจริงของผู้เรียน) — สถิติของแอดมิน
 * จึงกรองเฉพาะคำตอบหลังเวลาที่โจทย์ถูกแก้ ค่า NULL = ยังไม่เคยรีเซ็ต → นับทุกคำตอบ
 */
/** ฟิลด์ที่เปลี่ยนแล้วทำให้ "คำตอบที่ถูก" ของข้อนั้นมีความหมายใหม่ */
export const GRADING_CONTENT_FIELDS = [
  'questionText',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'explanation',
  'conversation',
  'article',
  'tapExercise',
] as const;

/** JSON ที่เรียงคีย์แล้ว — กันการเทียบพลาดเพราะลำดับคีย์ต่างกัน (status ของ tapExercise ไม่นับ) */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'status')
      .sort(([a], [b]) => a.localeCompare(b));
    return '{' + entries.map(([key, item]) => JSON.stringify(key) + ':' + canonicalJson(item)).join(',') + '}';
  }
  return JSON.stringify(value ?? null);
}

/**
 * แอดมินแก้ข้อความ/ตัวเลือก/เฉลย/คำอธิบายจริงหรือไม่
 *
 * ใช้ตัดสินว่าจะเลื่อน `stats_cutoff_at` เป็น "ตอนนี้" ไหม เพื่อไม่ให้คำตอบเก่า
 * ถูกนับด้วยความหมายใหม่ — ถ้าเป็นแค่การกดบันทึกโดยไม่เปลี่ยนเนื้อหา (หรือเปลี่ยนแค่
 * สถานะ/ระดับ/active) ต้องไม่รีเซ็ตสถิติ เพราะจะทำให้ตัวเลขหายโดยไม่มีสาเหตุ
 */
export function hasGradingContentChanged(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): boolean {
  return GRADING_CONTENT_FIELDS.some(
    (field) => field in patch && canonicalJson(patch[field]) !== canonicalJson(before[field]),
  );
}

export function countableAnswerFilter(): SQL {
  return sql`${userAnswers.createdAt} >= coalesce(${questions.statsCutoffAt}, '-infinity'::timestamptz)`;
}
