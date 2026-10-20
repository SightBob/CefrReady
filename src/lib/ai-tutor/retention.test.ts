/**
 * retention — dry-run ต้องไม่ลบอะไร (ทดสอบกับ DB จริง = Neon branch ai-tutor-migration)
 *
 * ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL หรือตาราง ai_tutor_messages ยังไม่มี
 * (เช่น prod ที่ยังไม่ได้รัน migration) — และลบแถวที่ทดสอบทิ้งเสมอ
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
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

const connectionString = process.env.DATABASE_URL;

/** ตรวจว่าตาราง ai_tutor_messages มีอยู่จริงไหม (ถ้ายังไม่รัน migration → skip) */
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
    const [user] = await db.select({ id: users.id }).from(users).limit(1);
    const [question] = await db.select({ id: questions.id }).from(questions).limit(1);
    userId = user?.id ?? '';
    questionId = question?.id ?? 0;

    // ล้างแถวทดสอบที่ค้างจากรอบก่อน (เช่น รันเทสค้าง/ถูกสังฆ์) ก่อน insert ใหม่
    if (userId && questionId) {
      await db.delete(aiTutorMessages).where(and(
        eq(aiTutorMessages.userId, userId),
        eq(aiTutorMessages.questionId, questionId),
        eq(aiTutorMessages.content, 'เก่าแก่เก่า'),
      ));
    }

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
    if (messageId) {
      await db.delete(aiTutorMessages).where(eq(aiTutorMessages.id, messageId));
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
