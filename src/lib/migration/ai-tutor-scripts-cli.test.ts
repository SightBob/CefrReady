/**
 * 4.2 — เทส CLI ของสคริปต์ AI Tutor ที่เขียน DB (ai-tutor-access / ai-tutor-retention)
 *
 * แบบ hermetic เหมือนเทสของ apply-migration:
 * - env ของ child สร้างใหม่ทั้งหมด (ไม่สืบทอด ...process.env ของเครื่อง)
 * - DOTENV_CONFIG_PATH ชี้ไปที่ไฟล์ที่ไม่มีอยู่ → .env จริงหลุดเข้าไม่ได้
 * - DATABASE_URL ปลอมชี้ไปพอร์ต 1 (ไม่มีอะไรฟัง) → ไม่มีการเขียนจริงแน่นอน
 *
 * กฎที่ต้องผ่าน:
 * 1. ไม่มี --apply → dry-run → ไม่เขียน (exit 0 และบอกว่า dry-run)
 * 2. --apply แต่ไม่มี --confirm-host → exit 1
 * 3. --confirm-host ไม่ตรงกับ DATABASE_URL → exit 1
 * 4. host อยู่ใน APPLY_MIGRATION_BLOCKED_HOSTS → exit 1
 * 5. ไม่ใช้ AI_TUTOR_TEST_DB_HOSTS เป็นตัวตัดสิน (host ที่อยู่ใน allowlist ของเทสยังต้องผ่านการยืนยัน host)
 */
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = resolve('.');
const FAKE_HOST = '127.0.0.1';
/** DATABASE_URL ปลอม — พอร์ต 1 ไม่มีอะไรฟัง (การเชื่อมต่อจะ fail เร็ว ๆ) */
const FAKE_URL = `postgresql://fake_user:fake_pw@${FAKE_HOST}:1/fake_db`;

type RunResult = { code: number; stdout: string; stderr: string };

/** env ของ child: สร้างใหม่ทั้งหมด (ไม่สืบทอด env ของเครื่อง) */
function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
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
    DOTENV_CONFIG_PATH: join(PROJECT_ROOT, 'tmp', 'no-such-dotenv-file'),
    DATABASE_URL: FAKE_URL,
    APPLY_MIGRATION_BLOCKED_HOSTS: '',
    ...extra,
  };
}

async function runScript(script: string, args: string[], env: Record<string, string> = {}): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        join('node_modules', 'tsx', 'dist', 'cli.mjs'),
        join('scripts', script),
        ...args,
      ],
      { cwd: PROJECT_ROOT, timeout: 60_000, env: childEnv(env) },
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

const SCRIPTS = [
  { name: 'ai-tutor-access.ts', args: ['grant', 'learner@example.com'] },
  { name: 'ai-tutor-retention.ts', args: [] },
] as const;

describe('สคริปต์ AI Tutor ที่เขียน DB — กันรันผิดฐาน', () => {
  it.each(SCRIPTS)('$name: ไม่มี --apply → dry-run ไม่เขียนอะไร', async (script) => {
    const result = await runScript(script.name, [...script.args]);
    const output = result.stdout + result.stderr;
    expect(result.code, output).toBe(0);
    expect(output).toContain('dry-run');
    // ต้องไม่ไปต่อฐานข้อมูลจริง (ต่อพอร์ต 1 = ไม่มีอะไรฟัง) → ไม่มี error การเชื่อมต่อ
    expect(output).not.toContain('ECONNREFUSED');
    expect(output).not.toMatch(/getaddrinfo|connect /i);
  });

  it.each(SCRIPTS)('$name: --apply แต่ไม่มี --confirm-host → exit 1', async (script) => {
    const result = await runScript(script.name, [...script.args, '--apply']);
    const output = result.stdout + result.stderr;
    expect(result.code, output).toBe(1);
    expect(output).toContain('--confirm-host');
  });

  it.each(SCRIPTS)('$name: --confirm-host ไม่ตรงกับ DATABASE_URL → exit 1', async (script) => {
    const result = await runScript(script.name, [
      ...script.args,
      '--apply',
      '--confirm-host', 'host-that-does-not-match.invalid',
    ]);
    const output = result.stdout + result.stderr;
    expect(result.code, output).toBe(1);
    expect(output).toContain('--confirm-host');
  });

  it.each(SCRIPTS)('$name: host อยู่ในบล็อกลิสต์ → ปฏิเสธ (แม้ใส่ --apply + --confirm-host ตรง)', async (script) => {
    const result = await runScript(script.name, [
      ...script.args,
      '--apply',
      '--confirm-host', FAKE_HOST,
    ], { APPLY_MIGRATION_BLOCKED_HOSTS: FAKE_HOST });
    const output = result.stdout + result.stderr;
    expect(result.code, output).toBe(1);
    expect(output).toContain('บล็อกลิสต์');
  });

  it.each(SCRIPTS)('$name: ไม่ใช้ AI_TUTOR_TEST_DB_HOSTS เป็นตัวอนุญาต (host ที่อยู่ใน allowlist ยังต้องยืนยัน)', async (script) => {
    // allowlist ของเทสถูกตั้งไว้ แต่สคริปต์ไม่รู้จัก → ยังต้องขอ --confirm-host
    const result = await runScript(script.name, [...script.args, '--apply'], {
      AI_TUTOR_TEST_DB_HOSTS: FAKE_HOST,
    });
    const output = result.stdout + result.stderr;
    expect(result.code, output).toBe(1);
    expect(output).toContain('--confirm-host');
  });
});
