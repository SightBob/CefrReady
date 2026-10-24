import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// quota.ts import '@/db' (ซึ่งโยน error ถ้าไม่มี DATABASE_URL) — เทสนี้ทดสอบเฉพาะ
// ฟังก์ชันบริสุทธิ์ จึง mock db ทิ้ง (ไม่ต้องต่อ DB จริง)
vi.mock('@/db', () => ({ db: { select: vi.fn(), transaction: vi.fn() } }));

import { bangkokDayStartUtc, questionQuotaLimit, systemDailyLimit, userDailyLimit, DEFAULT_SYSTEM_DAILY_LIMIT } from './quota';

describe('bangkokDayStartUtc — วันตามเวลาไทย (UTC+7)', () => {
  it('เวลาไทย 21 ต.ค. 03:00 → เริ่มวันที่ 21 ต.ค. 00:00 เวลาไทย (= 20 ต.ค. 17:00 UTC)', () => {
    const now = new Date('2026-10-20T20:00:00.000Z');
    expect(bangkokDayStartUtc(now).toISOString()).toBe('2026-10-20T17:00:00.000Z');
  });

  it('เวลาไทย 20 ต.ค. 23:59 → ยังเป็นวันที่ 20 ต.ค.', () => {
    const now = new Date('2026-10-20T16:59:00.000Z');
    expect(bangkokDayStartUtc(now).toISOString()).toBe('2026-10-19T17:00:00.000Z');
  });

  it('เวลาไทย 20 ต.ค. 00:01 → เริ่มวันใหม่แล้ว', () => {
    const now = new Date('2026-10-19T17:01:00.000Z');
    expect(bangkokDayStartUtc(now).toISOString()).toBe('2026-10-19T17:00:00.000Z');
  });

  it('วันใหม่ตามเวลาไทยต่างจากวัน UTC (ตี 7 ชั่วโมง)', () => {
    const now = new Date('2026-10-20T18:30:00.000Z');
    // เวลาไทย 21 ต.ค. 01:30 → วันที่ 21 ต.ค. (UTC ยังเป็นวันที่ 20)
    expect(bangkokDayStartUtc(now).toISOString()).toBe('2026-10-20T17:00:00.000Z');
    expect(now.getUTCDate()).toBe(20);
  });
});

describe('โควตาจาก env', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; });

  it('ไม่ตั้ง = ค่าเริ่มต้น (ข้อ 5, ผู้เรียน 50, ระบบมีเพดานจริง 10,000)', () => {
    delete process.env.AI_TUTOR_QUESTION_QUOTA;
    delete process.env.AI_TUTOR_USER_DAILY_LIMIT;
    delete process.env.AI_TUTOR_SYSTEM_DAILY_LIMIT;
    expect(questionQuotaLimit()).toBe(5);
    expect(userDailyLimit()).toBe(50);
    // เพดานรวมระบบต้องมีค่าจริงเสมอ (kill switch) ไม่ใช่ปิดทิ้ง
    expect(systemDailyLimit()).toBe(DEFAULT_SYSTEM_DAILY_LIMIT);
    expect(systemDailyLimit()).toBe(10_000);
  });

  it('เพดานรวมระบบ: ตั้ง env ได้ และค่า 0/ผิดพลาดกลับไปใช้ค่าเริ่มต้น', () => {
    process.env.AI_TUTOR_SYSTEM_DAILY_LIMIT = '500';
    expect(systemDailyLimit()).toBe(500);
    process.env.AI_TUTOR_SYSTEM_DAILY_LIMIT = '0';
    expect(systemDailyLimit()).toBe(DEFAULT_SYSTEM_DAILY_LIMIT);
    process.env.AI_TUTOR_SYSTEM_DAILY_LIMIT = 'abc';
    expect(systemDailyLimit()).toBe(DEFAULT_SYSTEM_DAILY_LIMIT);
  });

  it('อ่านค่าจาก env ได้', () => {
    process.env.AI_TUTOR_QUESTION_QUOTA = '3';
    process.env.AI_TUTOR_USER_DAILY_LIMIT = '10';
    process.env.AI_TUTOR_SYSTEM_DAILY_LIMIT = '500';
    expect(questionQuotaLimit()).toBe(3);
    expect(userDailyLimit()).toBe(10);
    expect(systemDailyLimit()).toBe(500);
  });

  it('ค่าผิดพลาด → ใช้ค่าเริ่มต้น', () => {
    process.env.AI_TUTOR_QUESTION_QUOTA = 'abc';
    expect(questionQuotaLimit()).toBe(5);
  });
});
