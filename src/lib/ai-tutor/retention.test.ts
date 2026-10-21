/**
 * retention — dry-run ต้องไม่ลบอะไร (ทดสอบกับ DB จริง = Neon branch ai-tutor-migration)
 *
 * ข้ามอัตโนมัติเมื่อ:
 * - ไม่ได้ตั้ง DATABASE_URL
 * - host ไม่อยู่ใน allowlist (AI_TUTOR_TEST_DB_HOSTS) หรืออยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS)
 * - ยังไม่มีตาราง ai_tutor_messages
 *
 * ⚠️ ใช้ "ผู้ใช้ทดสอบ" ที่สร้างขึ้นเอง → cleanup ลบเฉพาะแถวของผู้ใช้นั้น
 *    (เดิมลบตาม user+question ของผู้ใช้จริงในฐาน → อันตรายกับข้อมูลจริง)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, asc, eq, sql } from 'drizzle-orm';
import pg from 'pg';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { aiTutorMessages, questions, users } = await import('@/db/schema');
const {
  DEFAULT_RETENTION_DAYS,
  countRetentionTargets,
  parseRetentionArgs,
  retentionCutoff,
} = await import('./retention');
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
  console.warn(`[retention.test] ข้ามเทสที่ต่อ DB จริง: ${guard.reason}`);
}

/** ตรวจว่าตาราง ai_tutor_messages มีอยู่จริงไหม (ถ้ายังไม่รัน migration → skip) */
let hasTable = false;
if (guard.allowed) {
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

const describeLive = connectionString && guard.allowed && hasTable ? describe : describe.skip;

describe('parseRetentionArgs', () => {
  const env = (extra: Record<string, string>) => extra as unknown as NodeJS.ProcessEnv;

  it('ค่าเริ่มต้น = dry-run 180 วัน', () => {
    const args = parseRetentionArgs([], env({}));
    expect(args.apply).toBe(false);
    expect(args.blank).toBe(false);
    expect(args.days).toBe(DEFAULT_RETENTION_DAYS);
  });

  it('ต้องมี --apply จึงลบจริง', () => {
    expect(parseRetentionArgs(['--apply'], env({})).apply).toBe(true);
    expect(parseRetentionArgs(['--blank'], env({})).apply).toBe(false);
  });

  it('อ่านจำนวนวันจาก env และ --days', () => {
    expect(parseRetentionArgs([], env({ AI_TUTOR_RETENTION_DAYS: '90' })).days).toBe(90);
    expect(parseRetentionArgs(['--days=30'], env({})).days).toBe(30);
  });
});

describeLive('retention ↔ DB จริง', () => {
  let userId = '';
  let questionId = 0;
  let messageId = 0;

  beforeAll(async () => {
    // ผู้ใช้ทดสอบที่สร้างขึ้นเอง (ไม่ใช้ผู้ใช้จริงในฐานข้อมูล)
    userId = createTestDbUserId('retention');
    await db.insert(users).values({
      id: userId,
      email: testDbUserEmail(userId),
      name: 'AI Tutor Test (retention)',
    });

    // ใช้ข้อที่เรียงจาก id ต่ำสุดลำดับที่ 2 (ไฟล์เทส DB จริงแต่ละไฟล์ใช้คนละข้อ → ไม่ชนกันตอนรันขนาน)
    const [question] = await db.select({ id: questions.id }).from(questions).orderBy(asc(questions.id)).offset(1).limit(1);
    questionId = question?.id ?? 0;

    const [row] = await db
      .insert(aiTutorMessages)
      .values({
        userId,
        questionId,
        role: 'user',
        content: 'เก่าแก่เก่า',
        status: 'ok',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: aiTutorMessages.id });
    messageId = row?.id ?? 0;
  });

  afterAll(async () => {
    // ลบเฉพาะแถวของผู้ใช้ทดสอบที่เทสสร้างเอง
    if (userId) {
      await db.delete(aiTutorMessages).where(eq(aiTutorMessages.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it('นับแถวที่เก่ากว่าเกณฑ์ได้', async () => {
    const cutoff = retentionCutoff(180);
    const targets = await countRetentionTargets(cutoff);
    expect(targets.messages).toBeGreaterThanOrEqual(1);
  });

  it('dry-run ไม่ลบอะไรเลย (แถวเก่ายังอยู่)', async () => {
    const cutoff = retentionCutoff(180);
    const before = await countRetentionTargets(cutoff);

    // โหมด dry-run: นับอย่างเดียว
    const args = parseRetentionArgs([], {} as NodeJS.ProcessEnv);
    expect(args.apply).toBe(false);
    const after = await countRetentionTargets(cutoff);
    expect(after.messages).toBe(before.messages);

    const [stillThere] = await db
      .select({ id: aiTutorMessages.id })
      .from(aiTutorMessages)
      .where(and(eq(aiTutorMessages.id, messageId)))
      .limit(1);
    expect(stillThere).toBeTruthy();
  });
});
