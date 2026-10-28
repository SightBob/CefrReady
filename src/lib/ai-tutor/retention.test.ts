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

const { createTestDbUserId, evaluateTestDbGuard, importIfAllowed, testDbUserEmail } = await import('@/lib/test-db-guard');

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

// import หลังผ่าน guard เท่านั้น — src/db/index.ts throw เมื่อไม่มี DATABASE_URL
// และ ./retention ก็ดึง @/db ต่อเป็นทอด ๆ
const { db } = await importIfAllowed(guard.allowed, () => import('@/db'));
const { aiTutorMessages, questions, users } = await importIfAllowed(guard.allowed, () => import('@/db/schema'));
const {
  DEFAULT_RETENTION_DAYS,
  countRetentionTargets,
  parseRetentionArgs,
  retentionCutoff,
} = await importIfAllowed(guard.allowed, () => import('./retention'));

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

/**
 * ตรวจว่า migration 0050 (question_id → ON DELETE SET NULL) ถูกใช้กับฐานนี้แล้วหรือยัง
 * (ถ้ายังไม่ → เคส "แถวที่ question_id = NULL" จะข้าม เพราะลบข้อสอบแล้วแถวจะถูก cascade ลบ)
 */
let setNullApplied = false;
if (guard.allowed) {
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
    setNullApplied = (result.rows[0]?.delete_rule ?? '').toUpperCase() === 'SET NULL';
  } catch {
    setNullApplied = false;
  } finally {
    await pool.end();
  }
}
const describeSetNull = setNullApplied ? describe : describe.skip;

// parseRetentionArgs เป็น pure แต่ ./retention ดึง @/db ที่ระดับบนสุด → ถ้าไม่มี
// DATABASE_URL จะ import โมดูลไม่ได้เลย จึงรันเฉพาะเมื่อโหลดได้จริง (ไม่งั้นเทสแดง)
const describeArgs = typeof parseRetentionArgs === 'function' ? describe : describe.skip;

describeArgs('parseRetentionArgs', () => {
  const env = (extra: Record<string, string>) => extra as unknown as NodeJS.ProcessEnv;

  it('ค่าเริ่มต้น = dry-run 180 วัน', () => {
    const args = parseRetentionArgs([], env({}));
    expect(args.ok).toBe(true);
    if (!args.ok) return;
    expect(args.apply).toBe(false);
    expect(args.blank).toBe(false);
    expect(args.days).toBe(DEFAULT_RETENTION_DAYS);
  });

  it('ต้องมี --apply จึงลบจริง', () => {
    const withApply = parseRetentionArgs(['--apply'], env({}));
    expect(withApply.ok && withApply.apply).toBe(true);
    const withBlank = parseRetentionArgs(['--blank'], env({}));
    expect(withBlank.ok && withBlank.apply).toBe(false);
  });

  it('อ่านจำนวนวันจาก env และ --days', () => {
    const fromEnv = parseRetentionArgs([], env({ AI_TUTOR_RETENTION_DAYS: '90' }));
    expect(fromEnv.ok && fromEnv.days).toBe(90);
    const fromFlag = parseRetentionArgs(['--days=30'], env({}));
    expect(fromFlag.ok && fromFlag.days).toBe(30);
  });

  it('--days ทุกรูปแบบ: "--days 30" · "--days=30" · ไม่ใส่', () => {
    // ค่าเริ่มต้ม (ไม่ใส่ --days)
    const none = parseRetentionArgs([], env({}));
    expect(none.ok && none.days).toBe(DEFAULT_RETENTION_DAYS);
    const withApply = parseRetentionArgs(['--apply'], env({}));
    expect(withApply.ok && withApply.days).toBe(DEFAULT_RETENTION_DAYS);

    // มีช่องว่าง: --days 30
    const spaced = parseRetentionArgs(['--days', '30'], env({}));
    expect(spaced.ok && spaced.days).toBe(30);
    // มีเท่ากับ: --days=30
    const equals = parseRetentionArgs(['--days=30'], env({}));
    expect(equals.ok && equals.days).toBe(30);
    // ผสมกับ flag อื่น
    const mixed = parseRetentionArgs(['--apply', '--days', '45', '--confirm-host', 'h.example.com'], env({}));
    expect(mixed.ok && mixed.days).toBe(45);
    const mixed2 = parseRetentionArgs(['--days=45', '--blank'], env({}));
    expect(mixed2.ok && mixed2.days).toBe(45);
  });

  it('--days ผิดรูปแบบ → error (ไม่ fallback เงียบ)', () => {
    for (const bad of ['3O', '-5', '0', 'abc', '29', '']) {
      const spaced = parseRetentionArgs(['--days', bad], env({}));
      expect(spaced.ok, `--days ${bad}`).toBe(false);
      if (!spaced.ok) expect(spaced.error).toContain('--days');

      const equals = parseRetentionArgs([`--days=${bad}`], env({}));
      expect(equals.ok, `--days=${bad}`).toBe(false);
      if (!equals.ok) expect(equals.error).toContain('--days');
    }
  });

  it('--days ที่ถูกต้อง (30 ขึ้นไป) → ผ่าน', () => {
    const at30 = parseRetentionArgs(['--days', '30'], env({}));
    expect(at30.ok && at30.days).toBe(30);
    const at90 = parseRetentionArgs(['--days=90'], env({}));
    expect(at90.ok && at90.days).toBe(90);
  });

  it('env ที่ผิดรูปแบบ → error เหมือนกัน', () => {
    const bad = parseRetentionArgs([], env({ AI_TUTOR_RETENTION_DAYS: 'abc' }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('AI_TUTOR_RETENTION_DAYS');

    const tooSmall = parseRetentionArgs([], env({ AI_TUTOR_RETENTION_DAYS: '7' }));
    expect(tooSmall.ok).toBe(false);
  });

  it('--confirm-host ทั้งสองรูปแบบ', () => {
    const spaced = parseRetentionArgs(['--confirm-host', 'h.example.com'], env({}));
    expect(spaced.ok && spaced.confirmHost).toBe('h.example.com');
    const equals = parseRetentionArgs(['--confirm-host=h.example.com'], env({}));
    expect(equals.ok && equals.confirmHost).toBe('h.example.com');
    const none = parseRetentionArgs([], env({}));
    expect(none.ok && none.confirmHost).toBeNull();
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
    expect(args.ok && args.apply).toBe(false);
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

describeSetNull('retention ↔ DB จริง — แถวที่ question_id = NULL (ข้อสอบถูกลบแล้ว)', () => {
  let userId = '';
  let tempQuestionId = 0;
  let tempMessageId = 0;

  beforeAll(async () => {
    userId = createTestDbUserId('retention-null');
    await db.insert(users).values({
      id: userId,
      email: testDbUserEmail(userId),
      name: 'AI Tutor Test (retention null)',
    });

    const [created] = await db
      .insert(questions)
      .values({
        testTypeId: 'focus-form',
        questionText: 'ข้อสอบทดสอบ retention (question_id NULL)',
        cefrLevel: 'A2',
        active: 'true',
      })
      .returning({ id: questions.id });
    tempQuestionId = created?.id ?? 0;

    const [row] = await db
      .insert(aiTutorMessages)
      .values({
        userId,
        questionId: tempQuestionId,
        role: 'user',
        content: 'ข้อความเก่าของข้อสอบที่ถูกลบ',
        status: 'ok',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: aiTutorMessages.id });
    tempMessageId = row?.id ?? 0;
  });

  afterAll(async () => {
    if (tempMessageId) await db.delete(aiTutorMessages).where(eq(aiTutorMessages.id, tempMessageId));
    if (tempQuestionId) await db.delete(questions).where(eq(questions.id, tempQuestionId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  it('นับแถวที่ question_id = NULL ด้วย (ไม่กรอง question_id)', async () => {
    const cutoff = retentionCutoff(180);
    const before = await countRetentionTargets(cutoff);

    // ลบข้อสอบ → ข้อความยังอยู่ แต่ question_id เป็น NULL
    await db.delete(questions).where(eq(questions.id, tempQuestionId));

    const [row] = await db
      .select({ questionId: aiTutorMessages.questionId })
      .from(aiTutorMessages)
      .where(eq(aiTutorMessages.id, tempMessageId))
      .limit(1);
    expect(row).toBeTruthy();
    expect(row?.questionId).toBeNull();

    // จำนวนแถวที่จะถูกลบต้องรวมแถวนี้ด้วย
    const after = await countRetentionTargets(cutoff);
    expect(after.messages).toBe(before.messages + 1);
  });
});
