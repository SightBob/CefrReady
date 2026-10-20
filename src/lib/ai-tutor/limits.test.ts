/**
 * เพดานเวลาของ route /api/ai-tutor ต้องผูกกับ maxDuration ที่ Next.js อ่านตอน build
 * → ถ้าแก้ค่าหนึ่งแล้วลืมอีกค่า เทสนี้ต้องล้ม
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_S,
  AI_TUTOR_ROUTE_MAX_DURATION_S,
  AI_TUTOR_ROUTE_SLACK_S,
  resolveAiTutorFirstTokenTimeoutMs,
  resolveAiTutorTimeoutMs,
} from './limits';

const routeSource = readFileSync(
  join(process.cwd(), 'src/app/api/ai-tutor/route.ts'),
  'utf8',
);

describe('maxDuration ของ route ต้องตรงกับ limits.ts', () => {
  it('route export ค่า maxDuration = 75 (ค่าคงที่ อ่านตอน build)', () => {
    const match = routeSource.match(/export const maxDuration = (\d+);/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(AI_TUTOR_ROUTE_MAX_DURATION_S);
  });

  it('route ต้องไม่คำนวณ maxDuration จาก env/DB (Next.js ตรึงค่าตอน build)', () => {
    expect(routeSource).toContain('export const maxDuration = 75;');
    expect(routeSource).not.toMatch(/export const maxDuration = .*(process\.env|Math\.)/);
  });
});

describe('เพดาน timeout คำนวณจาก maxDuration', () => {
  it('timeout ต่อโมเดล = floor((maxDuration - slack) / 2)', () => {
    expect(AI_TUTOR_MAX_TIMEOUT_S).toBe(
      Math.floor((AI_TUTOR_ROUTE_MAX_DURATION_S - AI_TUTOR_ROUTE_SLACK_S) / 2),
    );
    expect(AI_TUTOR_MAX_TIMEOUT_S).toBe(30);
    expect(AI_TUTOR_MAX_TIMEOUT_MS).toBe(30_000);
  });

  it('หลัก + สำรอง + เผื่อ = maxDuration พอดี', () => {
    expect(AI_TUTOR_MAX_TIMEOUT_S * 2 + AI_TUTOR_ROUTE_SLACK_S).toBe(AI_TUTOR_ROUTE_MAX_DURATION_S);
  });

  it('ตั้งค่าเกินเพดาน → ถูกบีบกลับ', () => {
    expect(resolveAiTutorTimeoutMs('120000')).toBe(AI_TUTOR_MAX_TIMEOUT_MS);
    expect(resolveAiTutorTimeoutMs('30000')).toBe(30_000);
    expect(resolveAiTutorTimeoutMs('abc')).toBe(AI_TUTOR_MAX_TIMEOUT_MS);
    expect(resolveAiTutorTimeoutMs(undefined)).toBe(AI_TUTOR_MAX_TIMEOUT_MS);
  });

  it('first-token timeout ต้องไม่เกิน timeout ของครั้งเรียกและไม่เกินเพดาน', () => {
    expect(resolveAiTutorFirstTokenTimeoutMs('60000', 30_000)).toBe(30_000);
    expect(resolveAiTutorFirstTokenTimeoutMs('120000', 30_000)).toBe(AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS);
    expect(resolveAiTutorFirstTokenTimeoutMs('12000', 30_000)).toBe(12_000);
    // ไม่ได้ตั้ง → ครึ่งหนึ่งของ timeout แต่ไม่เกินเพดาน
    expect(resolveAiTutorFirstTokenTimeoutMs(undefined, 30_000)).toBe(15_000);
    expect(resolveAiTutorFirstTokenTimeoutMs(undefined, 20_000)).toBe(10_000);
  });
});
