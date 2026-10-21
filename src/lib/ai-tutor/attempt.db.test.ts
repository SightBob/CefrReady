/**
 * attempt_key (migration 0049) — บทสนทนา AI Tutor แยกต่อรอบการทำข้อสอบ
 *
 * ทดสอบกับ DB จริง (Neon branch ai-tutor-migration)
 * - ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL / host ไม่อยู่ใน allowlist (AI_TUTOR_TEST_DB_HOSTS)
 *   หรืออยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS) / ยังไม่มีคอลัมน์ attempt_key
 * - ใช้ "ผู้ใช้ทดสอบ" ที่สร้างขึ้นเอง → cleanup ลบเฉพาะแถวของผู้ใช้นั้น
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, asc, eq } from 'drizzle-orm';
import pg from 'pg';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { aiTutorMessages, questions, users } = await import('@/db/schema');
const { getThreadMessages, archiveAttempt, archiveThread } = await import('./messages');
const { countUsedQuestions, reserveQuestion } = await import('./quota');
const { db } = await import('@/db');
const { createTestDbUserId, evaluateTestDbGuard, testDbUserEmail } = await import('@/lib/test-db-guard');

const connectionString = process.env.DATABASE_URL;

/** guard กลาง (ดู src/lib/test-db-guard.ts) */
const guard = evaluateTestDbGuard({
  databaseUrl: connectionString,
  blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  allowedHosts: process.env.AI_TUTOR_TEST_DB_HOSTS,
});
if (!guard.allowed) {
  console.warn(`[attempt.db.test] ข้ามเทสที่ต่อ DB จริง: ${guard.reason}`);
}

/** ตรวจว่าตารางมีคอลัมน์ attempt_key แล้วหรือยัง (migration 0049) */
let hasAttemptKey = false;
if (guard.allowed) {
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

const describeLive = connectionString && guard.allowed && hasAttemptKey ? describe : describe.skip;

const ATTEMPT_A = 'attempt-aaaa-0001';
const ATTEMPT_B = 'attempt-bbbb-0002';
const ATTEMPT_C = 'attempt-cccc-0003';

describeLive('AI Tutor attempt_key ↔ DB จริง', () => {
  let userId = '';
  let questionId = 0;

  beforeAll(async () => {
    // ผู้ใช้ทดสอบที่สร้างขึ้นเอง (ไม่ใช้ผู้ใช้จริงในฐานข้อมูล)
    userId = createTestDbUserId('attempt');
    await db.insert(users).values({
      id: userId,
      email: testDbUserEmail(userId),
      name: 'AI Tutor Test (attempt)',
    });

    // ใช้ข้อที่เรียงจาก id ต่ำสุดลำดับที่ 3 (ไฟล์เทส DB จริงแต่ละไฟล์ใช้คนละข้อ → ไม่ชนกันตอนรันขนาน)
    const [question] = await db.select({ id: questions.id }).from(questions).orderBy(asc(questions.id)).offset(2).limit(1);
    questionId = question?.id ?? 0;

    await db.insert(aiTutorMessages).values([
      { userId, questionId, role: 'user', content: 'คำถามรอบ A', status: 'ok', attemptKey: ATTEMPT_A },
      { userId, questionId, role: 'assistant', content: 'คำตอบรอบ A', status: 'ok', attemptKey: ATTEMPT_A },
      { userId, questionId, role: 'user', content: 'คำถามรอบ B', status: 'ok', attemptKey: ATTEMPT_B },
      { userId, questionId, role: 'user', content: 'คำถามรอบเก่า (ไม่มีรอบ)', status: 'ok', attemptKey: null },
    ]);
  });

  afterAll(async () => {
    // ลบเฉพาะแถวของผู้ใช้ทดสอบที่เทสสร้างเอง
    if (userId) {
      await db.delete(aiTutorMessages).where(eq(aiTutorMessages.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
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

  it('ปิดรอบ (ทำจบ/ออกจากข้อสอบ) → เก็บถังทุกข้อของรอบนั้น แต่รอบอื่นไม่โดน', async () => {
    // ข้อที่ 2 ของรอบนี้ (คนละข้อกับข้อหลัก) → ต้องถูกเก็บถังพร้อมกัน
    const [otherQuestion] = await db.select({ id: questions.id }).from(questions).orderBy(asc(questions.id)).offset(3).limit(1);
    const otherQuestionId = otherQuestion?.id ?? 0;

    await db.insert(aiTutorMessages).values([
      { userId, questionId, role: 'user', content: 'คำถามรอบ C', status: 'ok', attemptKey: ATTEMPT_C },
      { userId, questionId: otherQuestionId, role: 'user', content: 'คำถามรอบ C ข้ออื่น', status: 'ok', attemptKey: ATTEMPT_C },
    ]);

    const archived = await archiveAttempt({ userId, attemptKey: ATTEMPT_C });
    expect(archived).toBe(2); // ทั้งสองข้อของรอบเดียวกัน

    expect(await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_C })).toHaveLength(0);
    expect(await getThreadMessages({ userId, questionId: otherQuestionId, attemptKey: ATTEMPT_C })).toHaveLength(0);

    // รอบอื่นยังอยู่ครบ (ไม่กระทบ)
    expect(await getThreadMessages({ userId, questionId, attemptKey: ATTEMPT_A })).toHaveLength(2);
  });

  it('ปิดรอบของคนอื่นไม่ได้ (ขอบเขตจำกัดด้วย userId)', async () => {
    const archived = await archiveAttempt({ userId: 'user-ไม่มีจริง', attemptKey: ATTEMPT_A });
    expect(archived).toBe(0);
  });
});
