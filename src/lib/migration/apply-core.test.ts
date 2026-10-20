/**
 * ตรรกะของ scripts/apply-migration.ts (ตัวช่วย apply migration)
 * เทสแบบไม่ต่อฐานข้อมูล — โฟกัสที่ "กันรันผิดฐาน" และการแยก statement/hash
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  describeTarget,
  isBlockedHost,
  listMigrationFiles,
  migrationNumber,
  parseArgs,
  resolveWhen,
  splitStatements,
} from './apply-core';

describe('parseArgs', () => {
  it('ค่าเริ่มต้น = dry-run (ไม่มี --apply)', () => {
    const args = parseArgs([]);
    expect(args.apply).toBe(false);
    expect(args.confirmHost).toBeNull();
    expect(args.files).toEqual([]);
  });

  it('อ่าน --apply / --from / --confirm-host / ไฟล์', () => {
    const args = parseArgs([
      '--apply',
      '--from', '45',
      '--confirm-host', 'ep-example.neon.tech',
      'drizzle/0048_ai_tutor_settings.sql',
    ]);
    expect(args.apply).toBe(true);
    expect(args.from).toBe(45);
    expect(args.confirmHost).toBe('ep-example.neon.tech');
    expect(args.files).toEqual(['drizzle/0048_ai_tutor_settings.sql']);
  });

  it('รองรับรูปแบบ --confirm-host=host', () => {
    expect(parseArgs(['--confirm-host=ep-example.neon.tech']).confirmHost).toBe('ep-example.neon.tech');
  });

  it('ตัวเลือกที่ไม่รู้จัก → error (ไม่ทำงานเงียบ ๆ)', () => {
    expect(() => parseArgs(['--unknown'])).toThrow(/ไม่รู้จักตัวเลือก/);
  });
});

describe('describeTarget', () => {
  it('ดึง host/port/database/user โดยไม่เอา password มาด้วย', () => {
    const target = describeTarget('postgresql://user:secret@ep-abc-def-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full');
    expect(target.host).toBe('ep-abc-def-pooler.ap-southeast-1.aws.neon.tech');
    expect(target.port).toBe('5432');
    expect(target.database).toBe('neondb');
    expect(target.user).toBe('user');
    expect(JSON.stringify(target)).not.toContain('secret');
  });

  it('ทำป้ายกำกับ branch ให้อ่านง่าย', () => {
    const target = describeTarget('postgresql://u:p@ep-abc-def-pooler.ap-southeast-1.aws.neon.tech/neondb');
    expect(target.branchHint).toBe('abc-def-pooler');
  });

  it('URL มาตรฐานไม่มี port → ใช้ 5432', () => {
    expect(describeTarget('postgresql://u:p@db.internal:5432/app').port).toBe('5432');
    expect(describeTarget('postgresql://u:p@db.internal/app').port).toBe('5432');
  });

  it('URL ผิด → error', () => {
    expect(() => describeTarget('not-a-url')).toThrow(/ไม่ใช่ URL/);
  });
});

describe('isBlockedHost — กันรันกับ production', () => {
  it('ชื่อ host ที่มี prod/production → บล็อก', () => {
    expect(isBlockedHost('ep-prod-abc.neon.tech')).toBe(true);
    expect(isBlockedHost('production-db.neon.tech')).toBe(true);
  });

  it('host ของ branch ปกติ → ไม่บล็อก', () => {
    expect(isBlockedHost('ep-abc-def-pooler.ap-southeast-1.aws.neon.tech')).toBe(false);
  });

  it('บล็อกลิสต์จาก env ก็บล็อกด้วย', () => {
    expect(isBlockedHost('ep-abc-def.neon.tech', ['ep-abc-def.neon.tech'])).toBe(true);
    expect(isBlockedHost('ep-abc-def.neon.tech', ['ep-other.neon.tech'])).toBe(false);
  });
});

describe('รายการไฟล์ migration', () => {
  it('เรียงตามเลข และข้ามไฟล์ที่ไม่ใช่ migration (audit_*.sql)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'migrations-'));
    writeFileSync(join(dir, '0048_b.sql'), 'select 1;');
    writeFileSync(join(dir, '0045_a.sql'), 'select 1;');
    writeFileSync(join(dir, 'audit_duplicates.sql'), 'select 1;');
    writeFileSync(join(dir, 'notes.txt'), 'x');

    const files = listMigrationFiles(dir);
    expect(files.map((file) => file.split(/[\\/]/).pop())).toEqual(['0045_a.sql', '0048_b.sql']);
  });

  it('เลขนำหน้า', () => {
    expect(migrationNumber('drizzle/0048_ai_tutor_settings.sql')).toBe(48);
    expect(migrationNumber('0045_x.sql')).toBe(45);
    expect(migrationNumber('audit_x.sql')).toBe(-1);
  });
});

describe('splitStatements', () => {
  it('แยกตาม statement-breakpoint และตัดคอมเมนต์ออก', () => {
    const text = [
      '-- comment',
      'CREATE TABLE a (id int);',
      '--> statement-breakpoint',
      '-- another comment',
      'CREATE TABLE b (id int);',
    ].join('\n');

    expect(splitStatements(text)).toEqual([
      'CREATE TABLE a (id int);',
      'CREATE TABLE b (id int);',
    ]);
  });

  it('ไฟล์ว่าง → ไม่มี statement', () => {
    expect(splitStatements('-- only a comment\n')).toEqual([]);
  });
});

describe('resolveWhen', () => {
  it('ใช้ journal.when เมื่อมี entry ตรงกับไฟล์', () => {
    const dir = mkdtempSync(join(tmpdir(), 'journal-'));
    const journal = join(dir, '_journal.json');
    writeFileSync(journal, JSON.stringify({ entries: [{ tag: '0048_x', when: 1791460400000 }] }));
    const file = join(dir, '0048_x.sql');
    writeFileSync(file, 'select 1;');

    expect(resolveWhen(file, journal)).toBe(1791460400000);
  });

  it('ไม่มี journal/ไม่มี entry → ใช้เวลาแก้ไฟล์', () => {
    const dir = mkdtempSync(join(tmpdir(), 'journal-'));
    const file = join(dir, '0049_y.sql');
    writeFileSync(file, 'select 1;');

    const when = resolveWhen(file, join(dir, 'ไม่มี.json'));
    expect(Number.isFinite(when)).toBe(true);
    expect(when).toBeGreaterThan(0);
  });
});
