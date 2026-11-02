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
export function countableAnswerFilter(): SQL {
  return sql`${userAnswers.createdAt} >= coalesce(${questions.statsCutoffAt}, '-infinity'::timestamptz)`;
}
