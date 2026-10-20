// @vitest-environment jsdom
/**
 * รหัสรอบการทำข้อสอบของ AI Tutor (attempt key)
 * - ต้องคงเดิมในรอบเดียว (รีเฟรชแล้วยังเห็นบทสนทนาเดิม)
 * - ต้องเปลี่ยนเมื่อเริ่มรอบใหม่ (ทำซ้ำ/ส่งแล้ว)
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  ATTEMPT_KEY_PATTERN,
  attemptKeyStorageKey,
  getOrCreateAttemptKey,
  isValidAttemptKey,
  rotateAttemptKey,
} from './attempt-key';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('attempt key — รูปแบบ', () => {
  it('รับ UUID และคีย์ทั่วไปที่ยาว 8-64 ตัว', () => {
    expect(isValidAttemptKey('3f2b1c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d')).toBe(true);
    expect(isValidAttemptKey('attempt-aaaa-0001')).toBe(true);
    expect(isValidAttemptKey('a'.repeat(64))).toBe(true);
  });

  it('ปฏิเสธค่าที่ผิดรูปแบบ/สั้นเกิน/ยาวเกิน/มีอักขระแปลก', () => {
    expect(isValidAttemptKey('สั้น')).toBe(false);
    expect(isValidAttemptKey('a'.repeat(7))).toBe(false);
    expect(isValidAttemptKey('a'.repeat(65))).toBe(false);
    expect(isValidAttemptKey('มี ช่องว่าง')).toBe(false);
    expect(isValidAttemptKey('bad key!')).toBe(false);
    expect(isValidAttemptKey(undefined)).toBe(false);
    expect(isValidAttemptKey(123)).toBe(false);
  });

  it('pattern เป็นตัวเดียวกับที่ validator ใช้', () => {
    expect(ATTEMPT_KEY_PATTERN.test('attempt-aaaa-0001')).toBe(true);
    expect(ATTEMPT_KEY_PATTERN.test('bad key!')).toBe(false);
  });
});

describe('attempt key — จัดการใน sessionStorage', () => {
  it('คีย์ผูกกับชุดข้อสอบ (คนละชุด = คนละรอบ)', () => {
    expect(attemptKeyStorageKey('focus-form', 15)).toBe('ai-tutor-attempt:focus-form:15');
    expect(attemptKeyStorageKey('focus-form', 15)).not.toBe(attemptKeyStorageKey('focus-form', 16));
  });

  it('อ่านคีย์เดิมได้ (รีเฟรชในรอบเดิม → บทสนทนาเดิมยังอยู่)', () => {
    const key = attemptKeyStorageKey('focus-form', 15);
    const first = getOrCreateAttemptKey(key);
    expect(getOrCreateAttemptKey(key)).toBe(first);
  });

  it('สร้างใหม่เมื่อหมุนรอบ (ทำซ้ำ/ส่งแล้ว → บทสนทนาเก่าไม่โผล่)', () => {
    const key = attemptKeyStorageKey('focus-form', 15);
    const first = getOrCreateAttemptKey(key);
    const rotated = rotateAttemptKey(key);
    expect(rotated).not.toBe(first);
    expect(getOrCreateAttemptKey(key)).toBe(rotated);
  });

  it('คีย์ที่สร้างมาต้องผ่านการตรวจรูปแบบเสมอ', () => {
    const key = attemptKeyStorageKey('focus-form', 15);
    expect(isValidAttemptKey(getOrCreateAttemptKey(key))).toBe(true);
    expect(isValidAttemptKey(rotateAttemptKey(key))).toBe(true);
  });

  it('คีย์เก่าที่ผิดรูปแบบใน sessionStorage → สร้างใหม่แทน', () => {
    const key = attemptKeyStorageKey('focus-form', 15);
    window.sessionStorage.setItem(key, 'ผิดรูปแบบ');
    expect(isValidAttemptKey(getOrCreateAttemptKey(key))).toBe(true);
  });
});
