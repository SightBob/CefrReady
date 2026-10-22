/**
 * โควตา AI Tutor กับ DB จริง (Neon branch ai-tutor-migration)
 *
 * ข้ามอัตโนมัติเมื่อ:
 * - ไม่ได้ตั้ง DATABASE_URL
 * - host ไม่อยู่ใน allowlist (AI_TUTOR_TEST_DB_HOSTS) หรืออยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS)
 * - ยังไม่มีตาราง ai_tutor_messages
 *
 * แต่ถ้าตั้ง DB ไว้แล้ว (ผ่าน guard) แต่คอลัมน์ที่เทสใช้ขาด → เทสตกพร้อมบอกว่าขาดอะไร
 * (ไม่ skip เงียบ ๆ เพราะจะทำให้ schema พังไปโดยไม่รู้ตัว)
 *
 * ⚠️ ใช้ "ผู้ใช้ทดสอบ" ที่สร้างขึ้นเองใน beforeAll → cleanup ลบเฉพาะแถวของผู้ใช้นั้น
 *    ไม่ไปลบแถวของผู้ใช้จริงที่อาจมีอยู่ในฐาน (สำเนา production)
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
const { reserveQuestion, countUsedQuestions, getDailyQuotaSnapshot, bangkokDayStartUtc } = await import('./quota');
const { markUserMessageFailed } = await import('./messages');
const { createTestDbUserId, evaluateTestDbGuard, testDbUserEmail } = await import('@/lib/test-db-guard');

const connectionString = process.env.DATABASE_URL;

/**
 * guard กลาง: เทสต่อ DB จริงรันเฉพาะ host ที่อยู่ใน AI_TUTOR_TEST_DB_HOSTS
 * และไม่อยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS) เท่านั้น
 */
const guard = evaluateTestDbGuard({
  databaseUrl: connectionString,
  blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  allowedHosts: process.env.AI_TUTOR_TEST_DB_HOSTS,
});
if (!guard.allowed) {
  console.warn(`[quota.db.test] ข้ามเทสที่ต่อ DB จริง: ${guard.reason}`);
}

/** คอลัมน์ที่เทสชุดนี้ต้องใช้ (0046/0047/0049) */
const REQUIRED_COLUMNS = [
  'attempt_key',      // 0049 — ผูกแถวกับรอบการทำข้อสอบ
  'selected_answer',  // 0047 — คำตอบที่ผู้เรียนเลือก
  'is_correct',       // 0047
  'fallback_used',    // 0047
  'finish_reason',    // 0047
  'archived',         // 0046
  'created_at',       // 0046
  'status',           // 0046
];

let hasTable = false;
let hasAllColumns = false;
let missingColumns: string[] = [];
let tableMissing = false;
let connectionFailed = false;
let connectionError = '';

if (guard.allowed) {
  const pool = new pg.Pool({ connectionString });
  try {
    const tableResult = await pool.query(
      `select count(*)::int as n from information_schema.tables where table_name = 'ai_tutor_messages'`,
    );
    hasTable = (tableResult.rows[0]?.n ?? 0) > 0;
    tableMissing = !hasTable;

    if (hasTable) {
      const columnResult = await pool.query(
        `select column_name from information_schema.columns
         where table_name = 'ai_tutor_messages' and column_name = any($1::text[])`,
        [REQUIRED_COLUMNS],
      );
      const found = new Set((columnResult.rows as Array<{ column_name: string }>).map((row) => row.column_name));
      missingColumns = REQUIRED_COLUMNS.filter((column) => !found.has(column));
      hasAllColumns = missingColumns.length === 0;
    }
  } catch (error) {
    hasTable = false;
    hasAllColumns = false;
    connectionFailed = true;
    connectionError = error instanceof Error ? error.message : String(error);
  } finally {
    await pool.end();
  }
}

/**
 * ตั้ง DB ไว้แล้ว + ผ่าน guard แต่ schema ไม่ครบ = ปัญหาจริง → ให้เทส "ตก" พร้อมบอกว่าขาดอะไร
 * (skip ได้เฉพาะตอนที่ไม่ได้ตั้ง DB หรือ host ไม่ผ่าน guard เท่านั้น)
 */
if (guard.allowed && !connectionFailed) {
  if (tableMissing) {
    describe('quota AI Tutor ↔ DB จริง (ตารางยังไม่มี)', () => {
      it('ตาราง ai_tutor_messages ไม่มีในฐานข้อมูลนี้ — ต้องรัน migration 0045-0049 ก่อน', () => {
        expect(
          ['ai_tutor_messages'],
          'ไม่พบตาราง ai_tutor_messages ในฐานข้อมูลที่เทสต่อ (ตั้ง DATABASE_URL ถูกต้องไหม? รัน migration 0045-0049 แล้วหรือยัง?)',
        ).toEqual([]);
      });
    });
  } else if (!hasAllColumns) {
    describe(`quota AI Tutor ↔ DB จริง (schema ไม่ครบ: ขาด ${missingColumns.join(', ')})`, () => {
      it('คอลัมน์ที่เทสใช้ไม่ครบ — ต้องรัน migration 0045-0049 ก่อน', () => {
        expect(
          missingColumns,
          `ตาราง ai_tutor_messages ขาดคอลัมน์: ${missingColumns.join(', ')} — ต้องรัน migration 0045-0049 ก่อน`,
        ).toEqual([]);
      });
    });
  }
}

/**
 * ตั้ง DB ไว้ + ผ่าน guard แต่ต่อฐานข้อมูลไม่ได้ = ปัญหาจริง (ไม่ใช่ skip)
 * → เทสต้อง "ตก" พร้อมบอกเหตุผล ไม่ใช่ข้ามเงียบ ๆ
 */
if (guard.allowed && connectionFailed) {
  describe('quota AI Tutor ↔ DB จริง (ต่อฐานข้อมูลไม่ได้)', () => {
    it('ต่อฐานข้อมูลที่เทสต่อไม่ได้ — เทส DB ต้องตก ไม่ใช่ skip', () => {
      expect(
        connectionError || 'ไม่ทราบสาเหตุ',
        'ตั้ง DATABASE_URL + AI_TUTOR_TEST_DB_HOSTS ไว้แล้ว แต่ต่อฐานข้อมูลไม่ได้ — ตรวจว่าฐานยังอยู่/ยังรันอยู่ และเครือข่ายเข้าถึงได้',
      ).toBe('');
    });
  });
}

const describeLive = connectionString && guard.allowed && hasTable && hasAllColumns ? describe : describe.skip;

describeLive('quota AI Tutor ↔ DB จริง', () => {
  let pool: pg.Pool;
  let db: NodePgDatabase<Record<string, never>>;
  let userId = '';
  let questionId = 0;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString });
    db = drizzle(pool) as unknown as NodePgDatabase<Record<string, never>>;

    // ผู้ใช้ทดสอบที่สร้างขึ้นเอง (ไม่ใช้ผู้ใช้จริงในฐานข้อมูล)
    userId = createTestDbUserId('quota');
    await db.insert(users).values({
      id: userId,
      email: testDbUserEmail(userId),
      name: 'AI Tutor Test (quota)',
    });

    // ใช้ข้อที่ id ต่ำสุด (ไฟล์เทสอื่นที่ต่อ DB จริงจะใช้ข้อคนละลำดับ → ไม่ชนกัน)
    const [question] = await db.select({ id: questions.id }).from(questions).orderBy(asc(questions.id)).limit(1);
    questionId = question?.id ?? 0;
    process.env.AI_TUTOR_QUESTION_QUOTA = '2';
  });

  afterAll(async () => {
    // ลบเฉพาะแถวของผู้ใช้ทดสอบที่เทสสร้างเอง
    if (userId) {
      await db.delete(aiTutorMessages).where(eq(aiTutorMessages.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    delete process.env.AI_TUTOR_QUESTION_QUOTA;
    await pool?.end();
  });

  it('ส่งพร้อมกันเกินโควตา → สำเร็จไม่เกินโควตา (กัน race)', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => (
      reserveQuestion({ userId, questionId, message: `race-${index}`, attemptKey: 'attempt-key-0001', dailyLimit: 100 })
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

    const next = await reserveQuestion({ userId, questionId, message: 'after-failure', attemptKey: 'attempt-key-0001', dailyLimit: 100 });
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
      attemptKey: 'attempt-key-0001',
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
      attemptKey: 'attempt-key-0001',
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
    const result = await reserveQuestion({ userId, questionId, message, attemptKey: 'attempt-key-0001', dailyLimit: 100 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reused).toBe(true);
      expect(result.messageId).toBe(created.id); // ใช้แถวเดิม
    }
    const usedAfter = await countUsedQuestions({ userId, questionId });
    expect(usedAfter).toBe(usedBefore + 1); // จองโควตา 1 ครั้ง (ไม่ใช่ 2)
  });

  it('โควตาไม่รีเซ็ตเมื่อเปลี่ยน attemptKey — นับต่อ (user, ข้อ) ต่อวันเดียวกัน', async () => {
    process.env.AI_TUTOR_QUESTION_QUOTA = '10';
    const before = await countUsedQuestions({ userId, questionId });

    // ถามคนละรอบ (attemptKey ต่างกัน) ที่ข้อเดียวกัน → ต้องนับต่อ ไม่รีเซ็ต
    const first = await reserveQuestion({
      userId, questionId, message: 'รอบ-A-ครั้งแรก', attemptKey: 'attempt-key-A', dailyLimit: 100,
    });
    expect(first.ok).toBe(true);

    const second = await reserveQuestion({
      userId, questionId, message: 'รอบ-B-ครั้งแรก', attemptKey: 'attempt-key-B', dailyLimit: 100,
    });
    expect(second.ok).toBe(true);

    const after = await countUsedQuestions({ userId, questionId });
    expect(after).toBe(before + 2); // เพิ่มขึ้น 2 ไม่ใช่รีเซ็ตเป็น 1

    // และถ้าเต็มโควตาแล้ว การเปลี่ยนรอบก็ยังถูกปฏิเสธ (เลี่ยงโควตาไม่ได้)
    process.env.AI_TUTOR_QUESTION_QUOTA = '2';
    const rejected = await reserveQuestion({
      userId, questionId, message: 'รอบ-C-พยายามเลี่ยง', attemptKey: 'attempt-key-C', dailyLimit: 100,
    });
    expect(rejected.ok).toBe(false);
    process.env.AI_TUTOR_QUESTION_QUOTA = '10';
  });
});

describe('quota AI Tutor ↔ DB จริง — เพดานรายวันของผู้เรียน (SQL)', () => {
  let pool: pg.Pool;
  let db: NodePgDatabase<Record<string, never>>;
  let userId = '';
  let questionIds: number[] = [];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString });
    db = drizzle(pool) as unknown as NodePgDatabase<Record<string, never>>;
    userId = createTestDbUserId('daily');
    await db.insert(users).values({
      id: userId,
      email: testDbUserEmail(userId),
      name: 'AI Tutor Test (daily)',
    });
    // ใช้ 3 ข้อแรกที่ id ต่ำสุด (ไฟล์เทสอื่นใช้ข้อถัดไป → ไม่ชนกัน)
    const rows = await db.select({ id: questions.id }).from(questions).orderBy(asc(questions.id)).limit(3);
    questionIds = rows.map((row) => row.id);
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(aiTutorMessages).where(eq(aiTutorMessages.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    await pool.end();
  });

  it('เกินเพดานรายวัน → ปฏิเสธ และจำนวนที่สำเร็จไม่เกินเพดาน (ข้ามข้อ → ไม่ชนกับข้อเดียวกัน)', async () => {
    const dailyLimit = 2;
    const results = [];
    for (const questionId of questionIds) {
      results.push(await reserveQuestion({
        userId,
        questionId,
        message: `daily-${questionId}`,
        attemptKey: 'attempt-key-daily-0001',
        limit: 10,
        dailyLimit,
      }));
    }

    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(dailyLimit);
    const rejected = results.find((r) => !r.ok);
    expect(rejected).toBeTruthy();
    if (rejected && !rejected.ok) {
      expect(rejected.reason).toBe('daily_quota');
      expect(rejected.quota.limit).toBe(dailyLimit);
      expect(rejected.quota.remaining).toBe(0);
    }

    // ตัวเลขที่แสดงผล (แหล่งเดียวกับตัวบังคับ) ต้องตรงกัน
    const snapshot = await getDailyQuotaSnapshot({ userId, limit: dailyLimit });
    expect(snapshot.used).toBe(dailyLimit);
    expect(snapshot.remaining).toBe(0);
  });

  it('ยิงพร้อมกันเกินเพดานรายวัน → สำเร็จไม่เกินเพดาน (advisory lock กัน race)', async () => {
    const dailyLimit = 2;
    const results = await Promise.all(questionIds.map((questionId) => reserveQuestion({
      userId,
      questionId,
      message: `race-${questionId}`,
      attemptKey: 'attempt-key-race-0001',
      limit: 10,
      dailyLimit,
    })));

    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBeLessThanOrEqual(dailyLimit);
    const rejected = results.filter((r) => !r.ok);
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    for (const r of rejected) {
      if (!r.ok) expect(r.reason).toBe('daily_quota');
    }
  });

  it('คำขอที่ล้มเหลว (แถว failed) ไม่ถูกนับเป็นโควตารายวัน', async () => {
    const before = await getDailyQuotaSnapshot({ userId, limit: 100 });
    const reserved = await reserveQuestion({
      userId,
      questionId: questionIds[0],
      message: 'daily-failed-case',
      attemptKey: 'attempt-key-daily-0001',
      limit: 10,
      dailyLimit: 100,
    });
    expect(reserved.ok).toBe(true);
    if (reserved.ok) {
      await markUserMessageFailed({ messageId: reserved.messageId });
    }
    const after = await getDailyQuotaSnapshot({ userId, limit: 100 });
    expect(after.used).toBe(before.used); // แถว failed ไม่นับ = โควตาถูกคืน
  });
});
