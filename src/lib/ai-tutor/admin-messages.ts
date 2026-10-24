/**
 * คำถาม/คำตอบของผู้เรียนสำหรับหน้า admin (อ่านอย่างเดียว)
 *
 * ข้อมูลมาจากตาราง ai_tutor_messages (ข้อความที่ผู้เรียนพิมพ์ถาม AI
 * + คำตอบของโมเดล) — เก็บไว้เพื่อนำไปปรับปรุงการสอน
 *
 * หลักการ:
 * - อ่านอย่างเดียว (ไม่มี side effect) → ใช้ร่วมกับ requireAdmin ได้
 * - จำกัดช่วงเวลา/จำนวนแถวเสมอ → ไม่ลากตารางทั้งก้อนมา
 * - ตัวกรอง (parse) แยกไว้ใน admin-message-filters.ts → เทสได้โดยไม่ต่อ DB
 */

import { and, desc, eq, gte, ilike, sql } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorMessages, questions, users } from '@/db/schema';

import type { AiTutorMessageFilters } from './admin-message-filters';

export type AiTutorMessageRow = {
  id: number;
  createdAt: Date;
  role: string;
  status: string;
  content: string;
  archived: boolean;
  /** null เมื่อข้อสอบถูกลบไปแล้ว (migration 0050 → ON DELETE SET NULL) */
  questionId: number | null;
  questionText: string | null;
  cefrLevel: string | null;
  grammarTopic: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  model: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  attemptKey: string | null;
};

export type AiTutorMessageSummary = {
  /** จำนวนคำถามของผู้เรียน */
  questions: number;
  /** จำนวนคำตอบของโมเดล */
  answers: number;
  /** จำนวนคำถามที่ล้มเหลว (คืนโควตาแล้ว) */
  failed: number;
  /** จำนวนผู้เรียนที่ถาม */
  learners: number;
  /** ข้อที่ถูกถามบ่อยที่สุด (questionId = null เมื่อข้อสอบถูกลบแล้ว) */
  topQuestions: Array<{ questionId: number | null; count: number; questionText: string | null }>;
};

/**
 * ดึงคำถาม/คำตอบของผู้เรียนตามตัวกรอง + สรุปยอด
 *
 * หมายเหตุเรื่อง index: คิวรีนี้กรองด้วย created_at ของทั้งตาราง
 * → ปัจจุบันไม่มี index ที่ใช้ได้ (ทุก index เริ่มด้วย user_id/question_id)
 * → ถ้าข้อมูลโตมากให้เพิ่ม index แยก (ดู runbook ข้อ 7)
 */
export async function listAiTutorMessages(filters: AiTutorMessageFilters): Promise<{
  rows: AiTutorMessageRow[];
  total: number;
  summary: AiTutorMessageSummary;
}> {
  const since = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000);

  const conditions = [gte(aiTutorMessages.createdAt, since)];
  if (filters.role !== 'all') conditions.push(eq(aiTutorMessages.role, filters.role));
  if (filters.status !== 'all') conditions.push(eq(aiTutorMessages.status, filters.status));
  if (filters.questionId !== null) conditions.push(eq(aiTutorMessages.questionId, filters.questionId));
  if (!filters.includeArchived) conditions.push(eq(aiTutorMessages.archived, false));
  if (filters.search) conditions.push(ilike(aiTutorMessages.content, `%${filters.search}%`));

  const where = and(...conditions);

  const [rows, countRows, summaryRows, topRows] = await Promise.all([
    db
      .select({
        id: aiTutorMessages.id,
        createdAt: aiTutorMessages.createdAt,
        role: aiTutorMessages.role,
        status: aiTutorMessages.status,
        content: aiTutorMessages.content,
        archived: aiTutorMessages.archived,
        questionId: aiTutorMessages.questionId,
        questionText: questions.questionText,
        cefrLevel: questions.cefrLevel,
        grammarTopic: questions.grammarTopic,
        userId: aiTutorMessages.userId,
        userEmail: users.email,
        userName: users.name,
        model: aiTutorMessages.model,
        latencyMs: aiTutorMessages.latencyMs,
        inputTokens: aiTutorMessages.inputTokens,
        outputTokens: aiTutorMessages.outputTokens,
        selectedAnswer: aiTutorMessages.selectedAnswer,
        isCorrect: aiTutorMessages.isCorrect,
        attemptKey: aiTutorMessages.attemptKey,
      })
      .from(aiTutorMessages)
      .leftJoin(users, eq(users.id, aiTutorMessages.userId))
      .leftJoin(questions, eq(questions.id, aiTutorMessages.questionId))
      .where(where)
      .orderBy(desc(aiTutorMessages.createdAt), desc(aiTutorMessages.id))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ n: sql<number>`count(*)::int` }).from(aiTutorMessages).where(where),
    db
      .select({
        questions: sql<number>`(count(*) filter (where ${aiTutorMessages.role} = 'user'))::int`,
        answers: sql<number>`(count(*) filter (where ${aiTutorMessages.role} = 'assistant'))::int`,
        failed: sql<number>`(count(*) filter (where ${aiTutorMessages.status} = 'failed'))::int`,
        learners: sql<number>`count(distinct ${aiTutorMessages.userId})::int`,
      })
      .from(aiTutorMessages)
      .where(where),
    db
      .select({
        questionId: aiTutorMessages.questionId,
        count: sql<number>`count(*)::int`,
        questionText: questions.questionText,
      })
      .from(aiTutorMessages)
      .leftJoin(questions, eq(questions.id, aiTutorMessages.questionId))
      .where(where)
      .groupBy(aiTutorMessages.questionId, questions.questionText)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  const summaryRow = summaryRows[0];

  return {
    rows: rows as AiTutorMessageRow[],
    total: countRows[0]?.n ?? 0,
    summary: {
      questions: summaryRow?.questions ?? 0,
      answers: summaryRow?.answers ?? 0,
      failed: summaryRow?.failed ?? 0,
      learners: summaryRow?.learners ?? 0,
      topQuestions: topRows.map((row) => ({
        questionId: row.questionId,
        count: row.count,
        questionText: row.questionText,
      })),
    },
  };
}
