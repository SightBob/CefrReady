/**
 * เทส "ย้อนกลับธุรกรรม" ของ scripts/apply-migration.ts
 *
 * สิ่งที่พิสูจน์:
 * - ถ้า statement ที่ 2 ของไฟล์ migration พัง → ทั้งไฟล์ถูกยกเลิก
 *   (statement ที่ 1 ถูก rollback และไม่มีแถว hash ค้างใน drizzle.__drizzle_migrations)
 *
 * ⚠️ เทสนี้ "รัน migration" จริง (แต่เป็นไฟล์ปลอมที่สร้างขึ้นในโฟลเดอร์ชั่วคราว
 *    และถูกย้อนกลับทิ้งทั้งหมด) → จึงมี 2 ชั้นป้องกัน:
 *    1. guard กลาง (host ต้องอยู่ใน AI_TUTOR_TEST_DB_HOSTS และไม่อยู่ในบล็อกลิสต์)
 *    2. ธงเปิดใช้อย่างจงใจ AI_TUTOR_TEST_RUN_MIGRATION_TESTS=1
 *       (ค่าเริ่มต้ม = ไม่รัน → เทสนี้ไม่มีทางไปแตะฐานข้อมูลโดยไม่ตั้งใจ)
 *
 * วิธีรัน:
 *   AI_TUTOR_TEST_RUN_MIGRATION_TESTS=1 npm run test:db
 */
import { afterAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const { evaluateTestDbGuard } = await import('@/lib/test-db-guard');

const connectionString = process.env.DATABASE_URL;

const guard = evaluateTestDbGuard({
  databaseUrl: connectionString,
  blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  allowedHosts: process.env.AI_TUTOR_TEST_DB_HOSTS,
});

/** ธงเปิดใช้อย่างจงใจ (ค่าเริ่มต้ม = ไม่รัน) */
const optIn = process.env.AI_TUTOR_TEST_RUN_MIGRATION_TESTS === '1';

const probeTable = `ai_tutor_migration_probe_${Date.now().toString(36)}`;

const describeLive = optIn && guard.allowed && connectionString ? describe : describe.skip;

if (!describeLive) {
  const reason = !optIn
    ? 'ไม่ได้ตั้ง AI_TUTOR_TEST_RUN_MIGRATION_TESTS=1'
    : guard.reason;
  console.warn(`[apply-migration-rollback.db.test] ข้าม: ${reason}`);
}

describeLive('scripts/apply-migration.ts — ย้อนกลับธุรกรรมเมื่อ statement พัง', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'apply-migration-rollback-'));

  afterAll(async () => {
    rmSync(tempDir, { recursive: true, force: true });
    // กันพลาด: ถ้าตาราง probe ยังอยู่ (transaction ไม่ rollback) → ลบทิ้งให้เรียบร้อย
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString });
    try {
      await pool.query(`DROP TABLE IF EXISTS "${probeTable}"`);
    } finally {
      await pool.end();
    }
  });

  it('statement ที่ 2 พัง → ไม่มีแถว hash ค้าง และ statement ที่ 1 ถูก rollback', async () => {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString });

    // ─── ไฟล์ migration ปลอม: statement 1 สร้างตาราง, statement 2 พัง (duplicate key) ───
    const sqlText = [
      `CREATE TABLE "${probeTable}" ("id" integer primary key);`,
      '--> statement-breakpoint',
      `INSERT INTO "${probeTable}" ("id") VALUES (1), (1);`,
      '',
    ].join('\n');
    const fakeFile = join(tempDir, '9999_fake_rollback_probe.sql');
    writeFileSync(fakeFile, sqlText, 'utf8');
    const fakeHash = createHash('sha256').update(sqlText).digest('hex');

    try {
      // ─── จำนวนแถวใน journal ก่อนรัน ───
      const before = await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations');
      const beforeCount = before.rows[0]?.n ?? 0;

      // ─── รัน CLI: --apply + --confirm-host ที่ตรงกับ host จริง ───
      const host = new URL(connectionString!).hostname;
      const childEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? '',
        SystemRoot: process.env.SystemRoot ?? '',
        COMSPEC: process.env.COMSPEC ?? '',
        PATHEXT: process.env.PATHEXT ?? '',
        TEMP: process.env.TEMP ?? '',
        TMP: process.env.TMP ?? '',
        USERPROFILE: process.env.USERPROFILE ?? '',
        APPDATA: process.env.APPDATA ?? '',
        LOCALAPPDATA: process.env.LOCALAPPDATA ?? '',
        NODE_ENV: 'test',
        DOTENV_CONFIG_PATH: join(tempDir, 'no-such-dotenv-file'),
        DATABASE_URL: connectionString!,
        APPLY_MIGRATION_BLOCKED_HOSTS: process.env.APPLY_MIGRATION_BLOCKED_HOSTS ?? '',
      };

      let code = 0;
      let output = '';
      try {
        const { stdout, stderr } = await execFileAsync(
          process.execPath,
          [
            resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'),
            resolve(process.cwd(), 'scripts', 'apply-migration.ts'),
            '--apply',
            '--confirm-host', host,
            fakeFile,
          ],
          { cwd: process.cwd(), timeout: 120_000, env: childEnv },
        );
        output = stdout + stderr;
      } catch (error) {
        const failure = error as { code?: number; stdout?: string; stderr?: string };
        code = typeof failure.code === 'number' ? failure.code : 1;
        output = (failure.stdout ?? '') + (failure.stderr ?? '');
      }

      // 1) ต้องล้มเหลว (ไม่ใช่ "เสร็จแล้ว")
      expect(code, output).not.toBe(0);
      expect(output).toContain('ล้มเหลว');
      expect(output).not.toContain('เสร็จแล้ว');

      // 2) ไม่มีแถว hash ของไฟล์ปลอมค้างใน journal
      const hashRow = await pool.query(
        'select count(*)::int as n from drizzle.__drizzle_migrations where hash = $1',
        [fakeHash],
      );
      expect(hashRow.rows[0]?.n, 'ไม่ควรมีแถว hash ของไฟล์ที่รันไม่สำเร็จ').toBe(0);

      // 3) จำนวนแถวใน journal ไม่เพิ่ม
      const after = await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations');
      expect(after.rows[0]?.n, 'จำนวนแถวใน journal ต้องเท่าเดิม').toBe(beforeCount);

      // 4) statement ที่ 1 ถูก rollback → ตาราง probe ต้องไม่มีอยู่
      const tableRow = await pool.query(
        'select count(*)::int as n from information_schema.tables where table_name = $1',
        [probeTable],
      );
      expect(tableRow.rows[0]?.n, 'statement ที่ 1 ต้องถูก rollback (ตาราง probe ต้องไม่เหลือ)').toBe(0);
    } finally {
      await pool.end();
    }
  }, 180_000);
});
