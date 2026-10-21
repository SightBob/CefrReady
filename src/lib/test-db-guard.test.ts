/**
 * Guard กลางของเทสที่ต่อฐานข้อมูลจริง
 */
import { describe, expect, it } from 'vitest';

import {
  TEST_DB_ALLOWED_HOSTS_ENV,
  TEST_DB_BLOCKED_HOSTS_ENV,
  createTestDbUserId,
  evaluateTestDbGuard,
  testDbUserEmail,
} from './test-db-guard';

const HOST = 'ep-abc-def-pooler.ap-southeast-1.aws.neon.tech';
const URL = `postgresql://user:pw@${HOST}/neondb`;

describe('evaluateTestDbGuard — ไม่รันเทส DB ถ้า host ไม่ปลอดภัย', () => {
  it('ไม่มี DATABASE_URL → ไม่รัน', () => {
    const result = evaluateTestDbGuard({ databaseUrl: undefined });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('DATABASE_URL');
    expect(result.host).toBeNull();
  });

  it('DATABASE_URL อ่านไม่ได้ → ไม่รัน', () => {
    const result = evaluateTestDbGuard({ databaseUrl: 'ไม่ใช่ url' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('อ่าน DATABASE_URL ไม่ได้');
  });

  it('host อยู่ในบล็อกลิสต์ → ไม่รัน (แม้จะอยู่ใน allowlist ด้วย)', () => {
    const result = evaluateTestDbGuard({
      databaseUrl: URL,
      blockedHosts: HOST,
      allowedHosts: HOST,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('บล็อกลิสต์');
    expect(result.host).toBe(HOST);
  });

  it('บล็อกลิสต์เป็นแบบคั่นด้วย comma และไม่สนตัวพิมพ์ใหญ่/เล็ก', () => {
    const result = evaluateTestDbGuard({
      databaseUrl: URL,
      blockedHosts: `other-host.neon.tech, ${HOST.toUpperCase()}`,
      allowedHosts: HOST,
    });
    expect(result.allowed).toBe(false);
  });

  it('ไม่ได้ตั้ง allowlist → ไม่รัน (ต้องเปิดใช้อย่างจงใจ)', () => {
    const result = evaluateTestDbGuard({ databaseUrl: URL });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain(TEST_DB_ALLOWED_HOSTS_ENV);
  });

  it('host ไม่อยู่ใน allowlist → ไม่รัน', () => {
    const result = evaluateTestDbGuard({
      databaseUrl: URL,
      allowedHosts: 'other-host.neon.tech',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('ไม่อยู่ใน');
  });

  it('host อยู่ใน allowlist และไม่อยู่ในบล็อกลิสต์ → อนุญาต', () => {
    const result = evaluateTestDbGuard({
      databaseUrl: URL,
      blockedHosts: 'other-host.neon.tech',
      allowedHosts: `another-host.neon.tech, ${HOST}`,
    });
    expect(result.allowed).toBe(true);
    expect(result.host).toBe(HOST);
  });

  it('บล็อกลิสต์ว่างเปล่า = ไม่บล็อก host ใด (ยังต้องผ่าน allowlist)', () => {
    const result = evaluateTestDbGuard({
      databaseUrl: URL,
      blockedHosts: '',
      allowedHosts: HOST,
    });
    expect(result.allowed).toBe(true);
  });

  it('env ที่ใช้มีชื่อที่คาดไว้', () => {
    expect(TEST_DB_BLOCKED_HOSTS_ENV).toBe('APPLY_MIGRATION_BLOCKED_HOSTS');
    expect(TEST_DB_ALLOWED_HOSTS_ENV).toBe('AI_TUTOR_TEST_DB_HOSTS');
  });
});

describe('ผู้ใช้ทดสอบ — id เฉพาะเทสนี้', () => {
  it('id ไม่ซ้ำกันระหว่างเทส และมี prefix บอกชัด', () => {
    const a = createTestDbUserId('quota');
    const b = createTestDbUserId('quota');
    expect(a).not.toBe(b);
    expect(a.startsWith('ai-tutor-test-quota-')).toBe(true);
  });

  it('email ใช้โดเมน .invalid (ไม่ชนกับผู้ใช้จริง)', () => {
    const id = createTestDbUserId('attempt');
    expect(testDbUserEmail(id)).toBe(`${id}@example.invalid`);
  });
});
