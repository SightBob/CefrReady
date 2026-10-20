/**
 * ช่วงค่าที่ตั้งได้ของ AI Tutor (src/lib/ai-tutor/ranges.ts)
 * - ใช้ร่วมกันทั้ง server (ตรวจตอนบันทึก + บีบตอนอ่านค่า) และ UI (min/max/step)
 */
import { describe, expect, it } from 'vitest';

import {
  AI_TUTOR_RANGES,
  AI_TUTOR_RANGE_KEYS,
  checkCrossFieldRules,
  checkRange,
  clampToRange,
  describeRange,
  isAiTutorRangeKey,
} from './ranges';

/** ชุดคีย์ที่มีช่วง (ใช้ในเทสแบบ loop) */
const AI_TOTER_KEYS_SAFE = AI_TUTOR_RANGE_KEYS;

describe('ranges — โครงสร้าง', () => {
  it('ทุกค่ามีช่วงที่ถูกต้อง (min < max, step > 0, จำนวนเต็ม)', () => {
    for (const key of AI_TUTOR_RANGE_KEYS) {
      const range = AI_TUTOR_RANGES[key];
      expect(range.min).toBeLessThan(range.max);
      expect(range.step).toBeGreaterThan(0);
      expect(Number.isInteger(range.min)).toBe(true);
      expect(Number.isInteger(range.max)).toBe(true);
      expect(range.hint.length).toBeGreaterThan(0);
    }
  });

  it('รู้ว่าคีย์ไหนมีช่วงค่า', () => {
    expect(isAiTutorRangeKey('questionQuota')).toBe(true);
    expect(isAiTutorRangeKey('primaryModel')).toBe(false);
  });

  it('describeRange แสดงช่วง', () => {
    expect(describeRange('questionQuota')).toBe('1–10');
    expect(describeRange('systemDailyLimit')).toBe('1–20000');
  });
});

describe('checkRange — ขอบเขตทุกค่า', () => {
  it('ค่าต่ำสุด/สูงสุดผ่าน', () => {
    for (const key of AI_TOTER_KEYS_SAFE) {
      const range = AI_TUTOR_RANGES[key];
      expect(checkRange(key, range.min), `${key} min`).toBeNull();
      expect(checkRange(key, range.max), `${key} max`).toBeNull();
    }
  });

  it('เกินขอบเขต (ต่ำ/สูง) ถูกปฏิเสธพร้อมบอกช่วง', () => {
    for (const key of AI_TOTER_KEYS_SAFE) {
      const range = AI_TUTOR_RANGES[key];
      const tooLow = checkRange(key, range.min - 1);
      const tooHigh = checkRange(key, range.max + 1);
      expect(tooLow, `${key} ต่ำเกิน`).toContain(`${range.min}–${range.max}`);
      expect(tooHigh, `${key} สูงเกิน`).toContain(`${range.min}–${range.max}`);
    }
  });

  it('ทศนิยม ค่าว่าง และค่าที่ไม่ใช่ตัวเลข ถูกปฏิเสธ', () => {
    expect(checkRange('questionQuota', 2.5)).toContain('จำนวนเต็ม');
    expect(checkRange('questionQuota', '')).toContain('ตัวเลข');
    expect(checkRange('questionQuota', null)).toContain('ตัวเลข');
    expect(checkRange('questionQuota', 'abc')).toContain('ตัวเลข');
    expect(checkRange('questionQuota', NaN)).toContain('ตัวเลข');
    expect(checkRange('questionQuota', Infinity)).toContain('ตัวเลข');
  });

  it('ค่าติดลบถูกปฏิเสธ (ช่วงไม่รวม 0 ยกเว้น rolloutPercent)', () => {
    expect(checkRange('questionQuota', -1)).toBeTruthy();
    expect(checkRange('userDailyLimit', -5)).toBeTruthy();
    expect(checkRange('systemDailyLimit', 0)).toBeTruthy();
  });
});

describe('clampToRange — บีบค่าให้อยู่ในช่วงเสมอ', () => {
  it('ค่าในช่วงไม่เปลี่ยน', () => {
    expect(clampToRange('questionQuota', 5)).toBe(5);
  });

  it('ค่าเกินช่วงถูกบีบเข้าขอบเขต', () => {
    expect(clampToRange('questionQuota', 999)).toBe(AI_TUTOR_RANGES.questionQuota.max);
    expect(clampToRange('questionQuota', -3)).toBe(AI_TUTOR_RANGES.questionQuota.min);
    expect(clampToRange('systemDailyLimit', 0)).toBe(AI_TUTOR_RANGES.systemDailyLimit.min);
    expect(clampToRange('systemDailyLimit', 1_000_000)).toBe(AI_TUTOR_RANGES.systemDailyLimit.max);
  });

  it('ค่าที่เพี้ยน (NaN/Infinity) กลายเป็นค่าต่ำสุด (ไม่พังระบบ)', () => {
    expect(clampToRange('maxTokens', NaN)).toBe(AI_TUTOR_RANGES.maxTokens.min);
    expect(clampToRange('maxTokens', Infinity)).toBe(AI_TUTOR_RANGES.maxTokens.min);
  });

  it('ทศนิยมถูกปัดเป็นจำนวนเต็ม', () => {
    expect(clampToRange('maxTokens', 1234.6)).toBe(1235);
  });
});

describe('checkCrossFieldRules — ความสัมพันธ์ระหว่างค่า', () => {
  it('เพดานรายวันต้องไม่น้อยกว่าโควตาต่อข้อ', () => {
    expect(checkCrossFieldRules({ questionQuota: 5, userDailyLimit: 5 })).toBeNull();
    expect(checkCrossFieldRules({ questionQuota: 5, userDailyLimit: 10 })).toBeNull();
    expect(checkCrossFieldRules({ questionQuota: 10, userDailyLimit: 5 })).toContain('โควตาต่อข้อ');
  });

  it('เวลารอชิ้นแรกต้องไม่เกินเวลารอสูงสุด', () => {
    expect(checkCrossFieldRules({ timeoutMs: 30000, firstTokenTimeoutMs: 12000 })).toBeNull();
    expect(checkCrossFieldRules({ timeoutMs: 10000, firstTokenTimeoutMs: 12000 })).toContain('เวลารอสูงสุด');
  });

  it('ไม่มีค่าที่สัมพันธ์กัน → ผ่าน', () => {
    expect(checkCrossFieldRules({})).toBeNull();
    expect(checkCrossFieldRules({ questionQuota: 5 })).toBeNull();
  });
});

