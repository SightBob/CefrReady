/**
 * 7.1 — ตั้ง DB ไว้ + ผ่าน guard แล้ว แต่ต่อฐานข้อมูลไม่ได้ → เทสต้อง "ตก" พร้อมข้อความ ไม่ใช่ skip
 *
 * ทดสอบแบบ end-to-end: สั่ง vitest ลูกให้รัน quota.db.test.ts ด้วย DATABASE_URL ที่ชี้ไปที่โฮสต์ที่ไม่มีจริง
 * แต่ใส่ AI_TUTOR_TEST_DB_HOSTS ให้ตรงกัน (ผ่าน guard) → ผลลัพธ์ต้องเป็น "ตก" (exit ไม่ใช่ 0) พร้อมข้อความ
 *
 * ไม่ต่อฐานข้อมูลจริง (พอร์ต 1 = ไม่มีอะไรฟัง) และไม่เขียนอะไร
 */
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';

const UNREACHABLE_HOST = '127.0.0.1';

describe('quota.db.test — ต่อฐานข้อมูลไม่ได้ต้อง "ตก" ไม่ใช่ skip', () => {
  it('รันด้วย env ที่ตั้ง DB ไว้และผ่าน guard แต่ต่อไม่ได้ → exit ไม่ใช่ 0 พร้อมข้อความ', () => {
    const result = spawnSync(
      process.execPath,
      [
        join('node_modules', 'vitest', 'vitest.mjs'),
        'run',
        'src/lib/ai-tutor/quota.db.test.ts',
        '--reporter=verbose',
      ],
      {
        cwd: resolve('.'),
        timeout: 180_000,
        env: {
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
          // ตั้ง DB ไว้ + ผ่าน guard แต่ชี้ไปที่พอร์ตที่ไม่มีอะไรฟัง
          DATABASE_URL: `postgresql://tester:tester@${UNREACHABLE_HOST}:1/nope`,
          AI_TUTOR_TEST_DB_HOSTS: UNREACHABLE_HOST,
          APPLY_MIGRATION_BLOCKED_HOSTS: '',
        },
      },
    );

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    // ต้อง "ตก" (exit ไม่ใช่ 0) ไม่ใช่ skip อย่างเงียบ ๆ
    expect(result.status, output.slice(0, 500)).not.toBe(0);
    expect(output).toContain('ต่อฐานข้อมูลที่เทสต่อไม่ได้');
    expect(output).toContain('เทส DB ต้องตก ไม่ใช่ skip');
  }, 200_000);
});
