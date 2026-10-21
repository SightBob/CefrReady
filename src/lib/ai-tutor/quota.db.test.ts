/**
 * โควตา AI Tutor กับ DB จริง (Neon branch ai-tutor-migration)
 *
 * ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL หรือตาราง ai_tutor_messages ยังไม่มี
 * (เช่น prod ที่ยังไม่ได้รัน migration) — และลบแถวที่ทดสอบทิ้งเสมอ
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, asc, eq, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { aiTutorMessages, questions, users } = await import('@/db/schema');
const { reserveQuestion, countUsedQuestions, bangkokDayStartUtc } = await import('./quota');
const { markUserMessageFailed } = await import('./messages');

const connectionString = process.env.DATABASE_URL;

let hasTable = false;
if (connectionString) {
  const pool = new pg.Pool({ connectionString });
  try {
    const result = await pool.query(
      `select count(*)::int as n from information_schema.tables where table_name = 'ai_tutor_messages'`,
    );
    hasTable = (result.rows[0]?.n ?? 0) > 0;
  } catch {
    hasTable = false;
  } finally {
    await pool.end();
  }
}

const describeLive = connectionString && hasTable ? describe : describe.skip;

describeLive('quota AI Tutor ↔ DB จริง', () => {
  let pool: pg.Pool;
  let db: NodePgDatabase<Record<string, never>>;
  let userId = '';
  let questionId = 0;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString });
    db = drizzle(pool) as unknown as NodePgDatabase<Record<string, never>>;
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    // ใช้ข้อที่ id ต่ำสุด (ไฟล์เทสอื่นที่ต่อ DB จริงจะใช้ข้อ id สูงสุด → ไม่ชนกัน)
    const [question] = await db.select({ id: questions.id }).from(questions).orderBy(asc(questions.id)).limit(1);
    userId = user?.id ?? '';
    questionId = question?.id ?? 0;
    process.env.AI_TUTOR_QUESTION_QUOTA = '2';

    // ล้างแถวทดสอบที่ค้างจากรอบก่อน (เช่น รันเทสค้าง/ถูกสังฆ์) ก่อนเริ่มใหม่
    if (userId && questionId) {
      await db.delete(aiTutorMessages).where(and(
        eq(aiTutorMessages.userId, userId),
        eq(aiTutorMessages.questionId, questionId),
      ));
    }
  });

  afterAll(async () => {
    if (userId && questionId) {
      await db.delete(aiTutorMessages).where(and(
        eq(aiTutorMessages.userId, userId),
        eq(aiTutorMessages.questionId, questionId),
      ));
    }
    delete process.env.AI_TUTOR_QUESTION_QUOTA;
    await pool?.end();
  });

  it('ส่งพร้อมกันเกินโควตา → สำเร็จไม่เกินโควตา (กัน race)', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => (
      reserveQuestion({ userId, questionId, message: `race-${index}`, attemptKey: 'attempt-key-0001' })
    )));
    const okCount = results.filter((result) => result.ok).length;
    expect(okCount).toBe(2);
  });

  it('ล้มเหลวก่อนมีเนื้อหา → คืนโควตา (failed ไม่ถูกนับ)', async () => {
    const failed = await db.select({ id: aiTutorMessages.id })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.userId, userId),
        eq(aiTutorMessages.questionId, questionId),
        eq(aiTutorMessages.status, 'pending'),
      ))
      .limit(1);
    expect(failed[0]).toBeTruthy();
    await markUserMessageFailed({ messageId: failed[0].id });

    const used = await countUsedQuestions({ userId, questionId });
    expect(used).toBe(1);

    const next = await reserveQuestion({ userId, questionId, message: 'after-failure', attemptKey: 'attempt-key-0001' });
    expect(next.ok).toBe(true);
  });

  it('แถวของเมื่อวาน (เวลาไทย) ไม่ถูกนับ → วันใหม่รีเซ็ต', async () => {
    const before = await countUsedQuestions({ userId, questionId });
    const yesterday = new Date(bangkokDayStartUtc().getTime() - 60 * 60 * 1000);
    await db.insert(aiTutorMessages).values({
      userId,
      questionId,
      role: 'user',
      content: 'yesterday',
      status: 'ok',
      createdAt: yesterday,
    });

    const used = await countUsedQuestions({ userId, questionId });
    expect(used).toBe(before); // แถวเมื่อวานถูกตัดออก (นับเฉพาะของวันไทยวันนี้)
  });

  it('แถว pending ที่ค้างเกิน 2 นาที (เซิร์ฟเวอร์ตายกลาง stream) ไม่นับเข้าโควตา', async () => {
    process.env.AI_TUTOR_QUESTION_QUOTA = '10';
    const before = await countUsedQuestions({ userId, questionId });
    const stale = new Date(Date.now() - 5 * 60 * 1000); // 5 นาทีก่อน
    await db.insert(aiTutorMessages).values({
      userId,
      questionId,
      role: 'user',
      content: 'stale-pending',
      status: 'pending',
      createdAt: stale,
    });

    const used = await countUsedQuestions({ userId, questionId });
    expect(used).toBe(before); // แถวค้างไม่ถูกนับ (โควตาถูกคืนโดยอัตโนมัติ)
  });

  it('ปุ่ม "ลองใหม่" ใช้แถว failed เดิม → ไม่เสียโควตา (ไม่มีแถวใหม่)', async () => {
    // เคสนี้ต้องมีโควตาว่าง (เคสก่อนหน้าใช้โควตาเต็มไปแล้ว)
    process.env.AI_TUTOR_QUESTION_QUOTA = '10';
    const message = 'retry-same-message';
    const [created] = await db.insert(aiTutorMessages).values({
      userId,
      questionId,
      role: 'user',
      content: message,
      status: 'failed',
      // ต้องอยู่รอบเดียวกันกับที่จะกด "ลองใหม่" (มิฉะนั้นจะไม่ใช้แถวเดิม)
      attemptKey: 'attempt-key-0001',
    }).returning({ id: aiTutorMessages.id });
    await markUserMessageFailed({ messageId: created.id });

    const usedBefore = await countUsedQuestions({ userId, questionId });
    const result = await reserveQuestion({ userId, questionId, message, attemptKey: 'attempt-key-0001' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reused).toBe(true);
      expect(result.messageId).toBe(created.id); // ใช้แถวเดิม
    }
    const usedAfter = await countUsedQuestions({ userId, questionId });
    expect(usedAfter).toBe(usedBefore + 1); // จองโควตา 1 ครั้ง (ไม่ใช่ 2)
  });
});
