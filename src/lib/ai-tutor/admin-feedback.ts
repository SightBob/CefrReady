/**
 * ผล 👍/👎 ของผู้เรียนต่อคำตอบ AI (อ่านอย่างเดียว) สำหรับหน้า admin
 *
 * ที่มา: ตาราง ai_tutor_feedback (หนึ่งคนหนึ่งเสียงต่อข้อความ, กดซ้ำ = ทับค่าเดิม)
 * - ตัวเลข = จำนวนเสียงในช่วงเวลาที่เลือก (ไม่นับซ้ำต่อคน)
 * - รายการที่แสดงคือข้อความที่ได้ 👎 ซึ่งเป็นสัญญาณว่าคำตอบยังไม่ดีพอ
 *   (เนื้อหาคำตอบ + โจทย์) → ผู้ดูแลเอาไปปรับ system prompt ได้
 *
 * หลักการเดียวกับ admin-messages.ts: จำกัดช่วงเวลา/จำนวนแถวเสมอ, ไม่มี side effect
 */

import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorFeedback, aiTutorMessages, questions } from '@/db/schema';

export type AiTutorDownvotedMessage = {
  messageId: number;
  /** วันที่กด 👎 (ISO) */
  votedAt: Date;
  content: string;
  model: string | null;
  /** null เมื่อข้อสอบถูกลบไปแล้ว (migration 0050) */
  questionText: string | null;
  grammarTopic: string | null;
  cefrLevel: string | null;
};

export type AiTutorFeedbackSummary = {
  days: number;
  up: number;
  down: number;
  total: number;
  /** ข้อความที่ได้ 👎 ล่าสุด (สูงสุด 10) */
  downvoted: AiTutorDownvotedMessage[];
};

/** จำนวนรายการ 👎 ที่ส่งให้หน้า admin — พอสำหรับดูแนวโน้ม ไม่ใช่ export ทั้งตาราง */
const DOWNVOTED_LIMIT = 10;

export async function getAiTutorFeedbackSummary(days: number): Promise<AiTutorFeedbackSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [countRows, downRows] = await Promise.all([
    db
      .select({ value: aiTutorFeedback.value, count: sql<number>`count(*)::int` })
      .from(aiTutorFeedback)
      .where(gte(aiTutorFeedback.createdAt, since))
      .groupBy(aiTutorFeedback.value),
    db
      .select({
        messageId: aiTutorFeedback.messageId,
        votedAt: aiTutorFeedback.createdAt,
        content: aiTutorMessages.content,
        model: aiTutorMessages.model,
        questionText: questions.questionText,
        grammarTopic: questions.grammarTopic,
        cefrLevel: questions.cefrLevel,
      })
      .from(aiTutorFeedback)
      .innerJoin(aiTutorMessages, eq(aiTutorMessages.id, aiTutorFeedback.messageId))
      // leftJoin: คำตอบของข้อสอบที่ถูกลบแล้วยังต้องเห็นได้
      .leftJoin(questions, eq(questions.id, aiTutorMessages.questionId))
      .where(and(
        eq(aiTutorFeedback.value, 'down'),
        gte(aiTutorFeedback.createdAt, since),
      ))
      .orderBy(desc(aiTutorFeedback.createdAt))
      .limit(DOWNVOTED_LIMIT),
  ]);

  const up = countRows.find((row) => row.value === 'up')?.count ?? 0;
  const down = countRows.find((row) => row.value === 'down')?.count ?? 0;

  return {
    days,
    up,
    down,
    total: up + down,
    downvoted: downRows,
  };
}
