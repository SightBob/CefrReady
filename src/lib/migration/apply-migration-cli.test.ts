/**
 * เทส CLI ของ scripts/apply-migration.ts (สคริปต์ที่ใช้รัน migration)
 *
 * ยืนยัน "กันรันผิดฐาน" ด้วยการ spawn จริง โดยใช้ DATABASE_URL ปลอม
 * (ชี้ไปที่พอร์ตที่ไม่มีอะไรฟัง) → ไม่แตะฐานข้อมูลจริงแน่นอน
 *
 * เคสที่ตรวจ:
 * 1. ไม่ใส่ --apply → dry-run: ไม่เขียนอะไรลง DB (และยังแสดงแผนได้แม้ต่อ DB ไม่ได้)
 * 2. ใส่ --apply แต่ไม่ใส่ --confirm-host → exit 1
 * 3. host ที่อยู่ใน APPLY_MIGRATION_BLOCKED_HOSTS → ถูกปฏิเสธ (exit 1)
 * 4. ผลลัพธ์ไม่มี password ของ DATABASE_URL หลุดออกมา
 */
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** DATABASE_URL ปลอม — พอร์ต 1 ไม่มีอะไรฟัง (การเชื่อมต่อจะ fail เร็ว ๆ) */
const FAKE_URL = 'postgresql://fake_user:sup3r-secret-pw@127.0.0.1:1/fake_db';
const FAKE_HOST = '127.0.0.1';

type RunResult = { code: number; stdout: string; stderr: string };

async function runCli(args: string[], env: Record<string, string> = {}): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        join('node_modules', 'tsx', 'dist', 'cli.mjs'),
        join('scripts', 'apply-migration.ts'),
        ...args,
      ],
      {
        cwd: process.cwd(),
        timeout: 60_000,
        env: {
          ...process.env,
          DATABASE_URL: FAKE_URL,
          // ไม่ให้ค่าจาก .env ของเครื่องแทรกเข้ามา
          AI_TUTOR_ENABLED: '',
          APPLY_MIGRATION_BLOCKED_HOSTS: '',
          ...env,
        },
      },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === 'number' ? failure.code : 1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    };
  }
}

describe('scripts/apply-migration.ts — การป้องกันการรันผิดฐาน', () => {
  it('ไม่ใส่ --apply → dry-run และไม่เขียนอะไรลง DB', async () => {
    const result = await runCli(['--from', '45']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('dry-run');
    expect(result.stdout).toContain('ai_tutor_attempt_key');
    // ไม่มีบรรทัดสำเร็จของการรันจริง
    expect(result.stdout).not.toContain('✅');
    expect(result.stdout).not.toContain('กำลังรัน');
  }, 60_000);

  it('ไม่มี --confirm-host → exit 1 พร้อมบอกให้ยืนยัน host', async () => {
    const result = await runCli(['--from', '45', '--apply']);

    expect(result.code).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('ขาด --confirm-host');
    expect(output).not.toContain('✅');
  }, 60_000);

  it('host ที่อยู่ในบล็อกลิสต์จาก env → ถูกปฏิเสธ', async () => {
    const result = await runCli(
      ['--from', '45', '--apply', '--confirm-host', FAKE_HOST],
      { APPLY_MIGRATION_BLOCKED_HOSTS: FAKE_HOST },
    );

    expect(result.code).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('อยู่ในบล็อกลิสต์');
    expect(output).toContain('--allow-blocked-host');
    expect(result.stdout).not.toContain('✅');
  }, 60_000);

  it('--confirm-host ที่ไม่ตรงกับ DATABASE_URL → exit 1', async () => {
    const result = await runCli(['--from', '45', '--apply', '--confirm-host', 'host-that-does-not-match']);

    expect(result.code).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('ไม่ตรงกับ DATABASE_URL');
  }, 60_000);

  it('ผลลัพธ์ไม่มี password ของ DATABASE_URL หลุดออกมา', async () => {
    for (const args of [
      ['--from', '45'],
      ['--from', '45', '--apply'],
      ['--from', '45', '--apply', '--confirm-host', FAKE_HOST],
    ]) {
      const result = await runCli(args);
      const output = result.stdout + result.stderr;
      expect(output, args.join(' ')).not.toContain('sup3r-secret-pw');
      expect(output, args.join(' ')).not.toContain(FAKE_URL);
    }
  }, 120_000);
});
