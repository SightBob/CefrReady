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
 * 5. --apply แล้วต่อ DB ไม่ได้ → exit non-zero (ไม่ใช่แสดงแผนต่อ)
 *
 * ⚠️ env ของ child ถูกสร้างขึ้นใหม่ทั้งหมด (ไม่สืบทอด ...process.env ของเครื่อง)
 *    และ DOTENV_CONFIG_PATH ชี้ไปที่ไฟล์ที่ไม่มีอยู่ → .env จริงของโปรเจกต์หลุดเข้าไปไม่ได้
 */
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** DATABASE_URL ปลอม — พอร์ต 1 ไม่มีอะไรฟัง (การเชื่อมต่อจะ fail เร็ว ๆ) */
const FAKE_URL = 'postgresql://fake_user:sup3r-secret-pw@127.0.0.1:1/fake_db';
const FAKE_HOST = '127.0.0.1';

/** ตัวแปรที่สคริปต์อ่านเกี่ยวกับฐานข้อมูล — ต้องปลอมทุกตัว */
const DB_ENV_KEYS = ['DATABASE_URL', 'APPLY_MIGRATION_BLOCKED_HOSTS'] as const;

type RunResult = { code: number; stdout: string; stderr: string };

/** env ของ child: สร้างใหม่ทั้งหมด ไม่สืบทอด env ของเครื่อง */
function buildChildEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    // ขั้นต่ำที่ node ต้องมีบน Windows
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
    // ไม่ให้ dotenv/config ไปอ่าน .env จริงของโปรเจกต์
    DOTENV_CONFIG_PATH: join(process.cwd(), 'tmp', 'no-such-dotenv-file'),
    // ค่าเริ่มต้นของตัวแปรที่สคริปต์อ่าน
    DATABASE_URL: FAKE_URL,
    APPLY_MIGRATION_BLOCKED_HOSTS: '',
    ...extra,
  };
}

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
        env: buildChildEnv(env),
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
  it('env ที่สคริปต์อ่านเกี่ยวกับ DB ถูกปลอมครบทุกตัว', () => {
    const env = buildChildEnv();
    for (const key of DB_ENV_KEYS) {
      expect(env[key], key).toBeDefined();
    }
    // ไม่สืบทอด env ของเครื่อง (เช่น DATABASE_URL จริงจาก .env)
    expect(env.DATABASE_URL).toBe(FAKE_URL);
    expect(env.DATABASE_URL).not.toContain('neon.tech');
  });

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

  it('--apply แล้วต่อ DB ไม่ได้ → exit non-zero (ไม่ใช่แสดงแผนต่อ)', async () => {
    // ผ่านทุก gate (บล็อกลิสต์ + confirm-host ตรง) แต่ฐานข้อมูลปลอมชี้ไปที่พอร์ตที่ไม่มีอะไรฟัง
    const result = await runCli([
      '--from', '45',
      '--apply',
      '--confirm-host', FAKE_HOST,
    ]);

    expect(result.code).not.toBe(0);
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/ล้มเหลว|ECONNREFUSED|connect/i);
    expect(output).not.toContain('✅');
    expect(output).not.toContain('เสร็จแล้ว');
  });

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
