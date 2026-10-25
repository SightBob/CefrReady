// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadTestProgress, saveTestProgress } from './test-progress';

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('test-progress', () => {
  it('ยังไม่เคยเริ่มชุด = null', () => {
    expect(loadTestProgress('focus-form', 15)).toBeNull();
  });

  it('save แล้ว load ได้ค่าเดิม (ทำข้อ 2 อยู่ → refresh กลับมาข้อ 2)', () => {
    expect(saveTestProgress('focus-form', 15, 2)).toBe(true);
    expect(loadTestProgress('focus-form', 15)).toBe(2);
  });

  it('แยกกันต่อ section/set', () => {
    saveTestProgress('focus-form', 15, 2);
    expect(loadTestProgress('focus-form', 16)).toBeNull();
    expect(loadTestProgress('listening', 15)).toBeNull();
  });

  it('เขียนทับด้วยตำแหน่งล่าสุดเสมอ', () => {
    saveTestProgress('focus-form', 15, 0);
    saveTestProgress('focus-form', 15, 7);
    expect(loadTestProgress('focus-form', 15)).toBe(7);
  });

  it('ค่าที่เก็บไว้เสียหาย/ติดลบ → ถือว่าไม่มี', () => {
    window.sessionStorage.setItem('cefr_set_progress_focus-form-15', 'abc');
    expect(loadTestProgress('focus-form', 15)).toBeNull();
    window.sessionStorage.setItem('cefr_set_progress_focus-form-15', '-3');
    expect(loadTestProgress('focus-form', 15)).toBeNull();
  });

  it('index ที่ไม่ใช่จำนวนเต็ม/ติดลบ ไม่ถูกบันทึก', () => {
    expect(saveTestProgress('focus-form', 15, -1)).toBe(false);
    expect(saveTestProgress('focus-form', 15, 1.5)).toBe(false);
    expect(loadTestProgress('focus-form', 15)).toBeNull();
  });

  it('sessionStorage ใช้ไม่ได้ → คืน false และไม่ throw (หน้าสอบใช้ค่านี้กันลูป)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveTestProgress('focus-form', 15, 1)).not.toThrow();
    expect(saveTestProgress('focus-form', 15, 1)).toBe(false);
  });

  it('อ่านไม่ได้ (getItem throw) → null ไม่ throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => loadTestProgress('focus-form', 15)).not.toThrow();
    expect(loadTestProgress('focus-form', 15)).toBeNull();
  });
});
