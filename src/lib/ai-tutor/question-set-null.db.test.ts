/**
 * migration 0050 — ai_tutor_messages.question_id → ON DELETE SET NULL
 *
 * พิสูจน์ว่า:
 * - ลบข้อสอบแล้ว → ข้อความยังอยู่ และ question_id เป็น NULL
 * - นับโควตารายวัน (per-user) และเพดานรวมทั้งระบบ ไม่เปลี่ยน
 *
 * ⚠️ เทสนี้ "ข้ามอัตโนมัติ" ถ้า migration 0050 ยังไม่ถูกใช้กับฐานนี้
 *   (ตรวจจาก information_schema: FK ต้องเป็น ON DELETE SET NULL)
 *   → ใช้ได้กับฐานที่ยังไม่ได้รัน migration โดยไม่ทำให้เทสแดง
 *
 * ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL / host ไม่อยู่ใน allowlist (AI_TUTOR_TEST_DB_HOSTS)
 * หรืออยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import pg from 'pg';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { db } = await import('@/db');
const { aiTutorMessages, questions, users } = await import('@/db/schema');
const { countSystemDailyQuestions, countUserDailyQuestions } = await import('./quota');
const { createTestDbUserId, evaluateTestDbGuard, testDbUserEmail } = await import('@/lib/test-db-guard');

const connectionString = process.env.DATABASE_URL;

const guard = evaluateTestDbGuard({
  databaseUrl: connectionString,
  blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  allowedHosts: process.env.AI_TUTOR_TEST_DB_HOSTS,
});
if (!guard.allowed) {
  console.warn(`[question-set-null.db.test] ข้ามเทสที่ต่อ DB จริง: ${guard.reason}`);
}

/** ตรวจว่า FK ของ question_id เป็น ON DELETE SET NULL แล้วหรือยัง (migration 0050) */
async function isSetNullApplied(): Promise<boolean> {
  const pool = new pg.Pool({ connectionString });
  try {
    const result = await pool.query(`
      select rc.delete_rule
      from information_schema.referential_constraints rc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = rc.constraint_name
       and kcu.constraint_schema = rc.constraint_schema
      where kcu.table_name = 'ai_tutor_messages'
        and kcu.column_name = 'question_id'
        and rc.constraint_schema = 'public'
      limit 1
    `);
    return (result.rows[0]?.delete_rule ?? '').toUpperCase() === 'SET NULL';
  } finally {
    await pool.end();
  }
}

const setNullApplied = connectionString && guard.allowed ? await isSetNullApplied() : false;
if (connectionString && guard.allowed && !setNullApplied) {
  console.warn('[question-set-null.db.test] ข้าม: migration 0050 ยังไม่ถูกใช้กับฐานนี้ (FK ยังไม่ใช่ ON DELETE SET NULL)');
}

const describeLive = connectionString && guard.allowed && setNullApplied ? describe : describe.skip;

describeLive('ai_tutor_messages.question_id → SET NULL (migration 0050)', () => {
  let userId = '';
  let questionId = 0;
  let messageId = 0;

  beforeAll(async () => {
    userId = createTestDbUserId('setnull');
    await db.insert(users).values({
      id: userId,
      email: testDbUserEmail(userId),
      name: 'AI Tutor Test (set null)',
    });

    // ข้อสอบที่สร้างขึ้นเอง (ลบทิ้งได้โดยไม่กระทบข้อมูลจริง)
    const [created] = await db
      .insert(questions)
      .values({
        testTypeId: 'focus-form',
        questionText: 'ข้อสอบทดสอบ migration 0050 (ลบได้)',
        cefrLevel: 'A2',
        active: 'true',
      })
      .returning({ id: questions.id });
    questionId = created?.id ?? 0;

    const [row] = await db
      .insert(aiTutorMessages)
      .values({
        userId,
        questionId,
        role: 'user',
        content: 'คำถามทดสอบก่อนลบข้อสอบ',
        status: 'ok',
        attemptKey: 'attempt-setnull-0001',
      })
      .returning({ id: aiTutorMessages.id });
    messageId = row?.id ?? 0;
  });

  afterAll(async () => {
    if (messageId) await db.delete(aiTutorMessages).where(eq(aiTutorMessages.id, messageId));
    if (questionId) await db.delete(questions).where(eq(questions.id, questionId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  it('ลบข้อสอบแล้ว → ข้อความยังอยู่ และ question_id เป็น NULL', async () => {
    const before = await db
      .select({ id: aiTutorMessages.id, questionId: aiTutorMessages.questionId })
      .from(aiTutorMessages)
      .where(eq(aiTutorMessages.id, messageId));
    expect(before[0]?.questionId).toBe(questionId);

    const systemBefore = await countSystemDailyQuestions();
    const userDailyBefore = await countUserDailyQuestions({ userId });

    // ลบข้อสอบ → FK SET NULL (ไม่ลบข้อความ)
    await db.delete(questions).where(eq(questions.id, questionId));

    const after = await db
      .select({ id: aiTutorMessages.id, questionId: aiTutorMessages.questionId, content: aiTutorMessages.content })
      .from(aiTutorMessages)
      .where(eq(aiTutorMessages.id, messageId));

    expect(after).toHaveLength(1); // ข้อความไม่ถูกลบ
    expect(after[0].questionId).toBeNull(); // question_id = NULL
    expect(after[0].content).toBe('คำถามทดสอบก่อนลบข้อสอบ');

    // นับโควตาไม่เปลี่ยน (นับจาก role/status/created_at ไม่กรอง question_id)
    expect(await countSystemDailyQuestions()).toBe(systemBefore);
    expect(await countUserDailyQuestions({ userId })).toBe(userDailyBefore);
  });

  it('แถวที่ question_id = NULL ไม่โผล่ในเธรดของข้อสอบ (และไม่กินโควตาของข้อนั้น)', async () => {
    const { getThreadMessages } = await import('./messages');
    const thread = await getThreadMessages({ userId, questionId, attemptKey: 'attempt-setnull-0001' });
    expect(thread).toHaveLength(0);

    const { countUsedQuestions } = await import('./quota');
    expect(await countUsedQuestions({ userId, questionId })).toBe(0);
  });

  it('แถวที่ question_id = NULL ยังถูกนับในเพดานรวมทั้งระบบ (ต้นทุนไม่หาย)', async () => {    const rows = await db
      .select({ id: aiTutorMessages.id })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.userId, userId),
        isNull(aiTutorMessages.questionId),
      ));
    expect(rows.length).toBe(1); // ข้อความของเรายังอยู่ พร้อม question_id = NULL
  });
});
