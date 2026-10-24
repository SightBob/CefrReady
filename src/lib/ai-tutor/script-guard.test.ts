/**
 * script-guard — กันสคริปต์ AI Tutor ที่เขียน DB ให้รันผิดฐาน
 *
 * เกณฑ์ที่มีผลจริงมีแค่ 3 อย่าง:
 * 1. ค่าเริ่มต้ม = dry-run (ต้อง --apply)
 * 2. ต้องยืนยัน --confirm-host ให้ตรงกับ host ของ DATABASE_URL
 * 3. host ที่อยู่ใน APPLY_MIGRATION_BLOCKED_HOSTS → ปฏิเสธ
 *
 * ⚠️ ไม่มีเกณฑ์ "ชื่อ host มีคำว่า prod" (เอาออกแล้ว — เดาจากชื่อไม่ใช่ชั้นป้องกันจริง)
 */
import { describe, expect, it } from 'vitest';

import {
  checkScriptWriteGuards,
  extractScriptFlags,
  hostOfDatabaseUrl,
  isHostBlocked,
  normalizeHost,
} from './script-guard';

const DIRECT_HOST = 'ep-example.ap-southeast-1.aws.neon.tech';
const POOLER_HOST = 'ep-example-pooler.ap-southeast-1.aws.neon.tech';

function url(host: string): string {
  return `postgresql://user:pw@${host}:5432/db`;
}

describe('normalizeHost — เทียบ host แบบ pooler/direct ของ branch เดียวกัน', () => {
  it('ตัด "-pooler" ออก (Neon ใช้ 2 แบบของ branch เดียวกัน)', () => {
    expect(normalizeHost(POOLER_HOST)).toBe(DIRECT_HOST);
    expect(normalizeHost(DIRECT_HOST)).toBe(DIRECT_HOST);
  });

  it('ไม่สนตัวพิมพ์ใหญ่/ช่องว่างรอบ ๆ', () => {
    expect(normalizeHost(`  ${POOLER_HOST.toUpperCase()}  `)).toBe(DIRECT_HOST);
  });

  it('host อื่นที่ไม่มี -pooler ไม่ถูกแก้', () => {
    expect(normalizeHost('db.example.com')).toBe('db.example.com');
    expect(normalizeHost('localhost')).toBe('localhost');
  });
});

describe('isHostBlocked — บล็อกลิสต์เทียบแบบไม่สนคำว่า pooler', () => {
  it('บล็อกลิสต์แบบ direct → บล็อก host แบบ pooler ด้วย (branch เดียวกัน)', () => {
    expect(isHostBlocked(POOLER_HOST, [DIRECT_HOST])).toBe(true);
  });

  it('บล็อกลิสต์แบบ pooler → บล็อก host แบบ direct ด้วย', () => {
    expect(isHostBlocked(DIRECT_HOST, [POOLER_HOST])).toBe(true);
  });

  it('host อื่นไม่ถูกบล็อก', () => {
    expect(isHostBlocked('db.other.example.com', [DIRECT_HOST])).toBe(false);
  });

  it('ไม่มีเกณฑ์ "ชื่อมีคำว่า prod" (เอาออกแล้ว — ต้องตั้งบล็อกลิสต์เอง)', () => {
    expect(isHostBlocked('prod-db.example.com', [])).toBe(false);
    expect(isHostBlocked('production.example.com', [])).toBe(false);
  });
});

describe('checkScriptWriteGuards', () => {
  it('ไม่มี DATABASE_URL → no_database_url', () => {
    const result = checkScriptWriteGuards({ apply: true, confirmHost: 'x', databaseUrl: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_database_url');
  });

  it('ไม่มี --apply → dry-run (ไม่เขียน)', () => {
    const result = checkScriptWriteGuards({
      apply: false,
      confirmHost: null,
      databaseUrl: url(DIRECT_HOST),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dryRun).toBe(true);
      expect(result.host).toBe(DIRECT_HOST);
    }
  });

  it('host ในบล็อกลิสต์ → ปฏิเสธ (แม้ใส่ --apply + --confirm-host ตรง)', () => {
    const result = checkScriptWriteGuards({
      apply: true,
      confirmHost: POOLER_HOST,
      databaseUrl: url(POOLER_HOST),
      blockedHosts: DIRECT_HOST, // บล็อกลิสต์แบบ direct → ต้องบล็อก host แบบ pooler ด้วย
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('blocked_host');
  });

  it('--apply แต่ไม่มี --confirm-host → missing_confirm_host', () => {
    const result = checkScriptWriteGuards({
      apply: true,
      confirmHost: null,
      databaseUrl: url(DIRECT_HOST),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing_confirm_host');
  });

  it('--confirm-host ไม่ตรง → mismatched_confirm_host', () => {
    const result = checkScriptWriteGuards({
      apply: true,
      confirmHost: 'other-host.example.com',
      databaseUrl: url(DIRECT_HOST),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('mismatched_confirm_host');
  });

  it('--confirm-host ตรง → อนุญาตให้เขียน', () => {
    const result = checkScriptWriteGuards({
      apply: true,
      confirmHost: DIRECT_HOST,
      databaseUrl: url(DIRECT_HOST),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dryRun).toBe(false);
  });

  it('--confirm-host ต่างกันแค่ "-pooler" → ถือว่าตรง (branch เดียวกัน)', () => {
    const result = checkScriptWriteGuards({
      apply: true,
      confirmHost: DIRECT_HOST,
      databaseUrl: url(POOLER_HOST),
    });
    expect(result.ok).toBe(true);
  });
});

describe('hostOfDatabaseUrl / extractScriptFlags', () => {
  it('อ่าน host จาก DATABASE_URL (ตัวพิมพ์เล็ก)', () => {
    expect(hostOfDatabaseUrl(url(DIRECT_HOST.toUpperCase()))).toBe(DIRECT_HOST);
    expect(hostOfDatabaseUrl('ไม่ใช่ URL')).toBeNull();
    expect(hostOfDatabaseUrl(undefined)).toBeNull();
  });

  it('แยก flag ออกจาก positional args', () => {
    const flags = extractScriptFlags(['grant', 'a@example.com', '--apply', '--confirm-host', 'h.example.com']);
    expect(flags.apply).toBe(true);
    expect(flags.confirmHost).toBe('h.example.com');
    expect(flags.rest).toEqual(['grant', 'a@example.com']);
  });

  it('รองรับ --confirm-host=ค่า', () => {
    const flags = extractScriptFlags(['--confirm-host=h.example.com', '--apply']);
    expect(flags.confirmHost).toBe('h.example.com');
    expect(flags.apply).toBe(true);
  });
});
