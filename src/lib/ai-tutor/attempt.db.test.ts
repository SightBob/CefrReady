/**
 * attempt_key (migration 0049) — บทสนทนา AI Tutor แยกต่อรอบการทำข้อสอบ
 *
 * ทดสอบกับ DB จริง (Neon branch ai-tutor-migration)
 * - ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL หรือตาราง ai_tutor_messages ยังไม่มี
 *   (เช่น prod ที่ยังไม่ได้รัน migration 0049) — และลบแถวที่ทดสอบทิ้งเสมอ
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, desc, eq } from 'drizzle-orm';
import pg from 'pg';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { aiTutorMessages, questions, users } = await import('@/db/schema');
const { getThreadMessages, archiveThread } = await import('./messages');
const { countUsedQuestions, reserveQuestion } = await import('./quota');
const { db } = await import('@/db');

const connectionString = process.env.DATABASE_URL;

/** ตรวจว่าตารางมีคอลัมน์ attempt_key แล้วหรือยัง (migration 0049) */
let hasAttemptKey = false;
if (connectionString) {
  const pool = new pg.Pool({ connectionString });
  try {
    const result = await pool.query(
      `select count(*)::int as n from information_schema.columns where table_name = 'ai_tutor_messages' and column_name = 'attempt_key'`,
    );
    hasAttemptKey = (result.rows[0]?.n ?? 0) > 0;
  } catch {
    hasAttemptKey = false;
  } finally {
    await pool.end();
  }
}

const describeLive = connectionString && hasAttemptKey ? describe : describe.skip;

const ATTEMPT_A = 'attempt-aaaa-0001';
const ATTEMPT_B = 'attempt-bbbb-0002';

describeLive('AI Tutor attempt_key ↔ DB จริง', () => {
  let userId = '';
  let questionId = 0;

  beforeAll(async () => {
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    // ใช้ข้อที่ id สูงสุด (quota.db.test.ts ใช้ข้อ id ต่ำสุด → สองไฟล์ไม่ชนกันตอนรันขนาน)
    const [question] = await db.select({ id: questions.id }).from(questions).orderBy(desc(questions.id)).limit(1);
    userId = user?.id ?? '';
    questionId = question?.id ?? 0;

    await db.delete(aiTutorMessages).where(and(
      eq(aiTutorMessages.userId, userId),
      eq(aiTutorMessages.questionId, questionId),
    ));

    await db.insert(aiTutorMessages).values([
      { userId, questionId, role: 'user', content: 'คำถามรอบ A', status: 'ok', attemptKey: ATTEMPT_A },
      { userId, questionId, role: 'assistant', content: 'คำตอบรอบ A', status: 'ok', attemptKey: ATTEMPT_A },
      { userId, questionId, role: 'user', content: 'คำถามรอบ B', status: 'ok', attemptKey: ATTEMPT_B },
      { userId, questionId, role: 'user', content: 'คำถามรอบเก่า (ไม่มีรอบ)', status: 'ok', attemptKey: null },
    ]);
  });

  afterAll(async () => {
    if (userId && questionId) {
      await db.delete(aiTutorMessages).where(and(
        eq(aiTutorMessages.userId, userId),
        eq(aiTutorMessages.questionId, questionId),
      ));
    }
  });

  it('แต่ละรอบเห็นเฉพาะเธรดของตัวเอง', async () => {
    const threadA = await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_A });
    expect(threadA.map((message) => message.content)).toEqual(['คำถามรอบ A', 'คำตอบรอบ A']);

    const threadB = await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_B });
    expect(threadB.map((message) => message.content)).toEqual(['คำถามรอบ B']);
  });

  it('แถวเก่าที่ไม่มี attempt_key ไม่แสดงในเธรดของรอบไหนเลย', async () => {
    const threadA = await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_A });
    const threadB = await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_B });
    expect(threadA.some((message) => message.content.includes('รอบเก่า'))).toBe(false);
    expect(threadB.some((message) => message.content.includes('รอบเก่า'))).toBe(false);
  });

  it('โควตาไม่รีเซ็ตเมื่อเปลี่ยนรอบ (ยังนับต่อ user+question ต่อวัน)', async () => {
    const used = await countUsedQuestions({ userId, questionId });
    expect(used).toBe(3); // รอบ A 2 แถว + รอบ B 1 แถว (แถวไม่มีรอบก็นับ)

    process.env.AI_TUTOR_QUESTION_QUOTA = '3';
    const reservation = await reserveQuestion({
      userId,
      questionId,
      message: 'คำถามใหม่ในรอบ B',
      attemptKey: ATTEMPT_B,
    });
    expect(reservation.ok).toBe(false); // โควตาของข้อนี้เต็มแล้ว แม้เปลี่ยนรอบ
    delete process.env.AI_TUTOR_QUESTION_QUOTA;
  });

  it('reset เก็บถังเฉพาะรอบปัจจุบัน (ข้อความรอบอื่นยังอยู่ใน DB)', async () => {
    const archived = await archiveThread({ userId, questionId, attemptKey: ATTEMPT_B });
    expect(archived).toBe(1);

    const threadA = await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_A });
    expect(threadA).toHaveLength(2);

    const threadB = await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_B });
    expect(threadB).toHaveLength(0);
  });
});
