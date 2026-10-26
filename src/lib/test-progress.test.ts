// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearBlankAnswers,
  ensureChoiceSeed,
  loadBlankAnswers,
  loadChoiceSeed,
  loadTestProgress,
  loadTestProgressState,
  rotateChoiceSeed,
  saveBlankAnswers,
  saveTestProgress,
  saveTestProgressState,
} from './test-progress';

const check = {
  isCorrect: true,
  correctKey: 'C',
  correctText: null,
  explanation: 'เหตุการณ์อดีตใช้กริยาช่อง 2',
};

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('test-progress', () => {
  it('ยังไม่เคยเริ่มชุด = null', () => {
    expect(loadTestProgress('focus-form', 15)).toBeNull();
    expect(loadTestProgressState('focus-form', 15)).toBeNull();
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

  // ─── คำตอบ + สถานะเฉลย (refresh แล้วต้องไม่กลับไปเริ่มทั้งชุด) ──────────

  it('บันทึก/อ่านคำตอบและสถานะเฉลยได้ครบ', () => {
    const saved = saveTestProgressState('focus-form', 16, {
      index: 3,
      answers: ['felt', null, 'went'],
      checked: { 0: check },
    });
    expect(saved).toBe(true);

    const state = loadTestProgressState('focus-form', 16);
    expect(state).not.toBeNull();
    expect(state?.index).toBe(3);
    expect(state?.answers).toEqual(['felt', null, 'went']);
    expect(state?.checked[0]).toMatchObject({ isCorrect: true, correctKey: 'C' });
    expect(state?.checked[0].explanation).toContain('อดีต');
  });

  it('เปลี่ยนข้อ (saveTestProgress) ต้องไม่ล้างคำตอบที่บันทึกไว้', () => {
    saveTestProgressState('focus-form', 16, {
      index: 0,
      answers: ['felt'],
      checked: { 0: check },
    });
    expect(saveTestProgress('focus-form', 16, 1)).toBe(true);

    const state = loadTestProgressState('focus-form', 16);
    expect(state?.index).toBe(1);
    expect(state?.answers).toEqual(['felt']);
    expect(state?.checked[0]).toMatchObject({ isCorrect: true });
    // ตำแหน่งที่อ่านแบบเดิมก็ยังใช้ได้
    expect(loadTestProgress('focus-form', 16)).toBe(1);
  });

  it('อ่านค่าแบบเก่า (เก็บเป็นเลขเดี่ยว) ได้ — คำตอบว่าง', () => {
    window.sessionStorage.setItem('cefr_set_progress_focus-form-16', '4');
    expect(loadTestProgress('focus-form', 16)).toBe(4);
    expect(loadTestProgressState('focus-form', 16)).toEqual({
      index: 4,
      answers: [],
      checked: {},
    });
  });

  it('JSON ที่ผิดรูป/ฟิลด์เพี้ยน → ทิ้งค่าที่ใช้ไม่ได้ ไม่ throw', () => {
    window.sessionStorage.setItem(
      'cefr_set_progress_focus-form-16',
      JSON.stringify({ index: 2, answers: ['ok', 42, null], checked: { x: check, 1: { isCorrect: 'yes' } } }),
    );
    const state = loadTestProgressState('focus-form', 16);
    expect(state?.index).toBe(2);
    expect(state?.answers).toEqual(['ok', null, null]);
    expect(state?.checked).toEqual({});

    window.sessionStorage.setItem('cefr_set_progress_focus-form-16', '{"index":"2"}');
    expect(loadTestProgressState('focus-form', 16)).toBeNull();
  });

  // ─── seed ลำดับตัวเลือก (คำตอบเก็บเป็นป้ายบนจอ ต้องมีลำดับเดิมเสมอ) ─────

  it('seed ตัวเลือก: สร้างครั้งแรกแล้วคงเดิมแม้เรียกซ้ำ (refresh ได้ลำดับเดิม)', () => {
    expect(loadChoiceSeed('focus-form', 15)).toBeNull();
    const first = ensureChoiceSeed('focus-form', 15);
    expect(first).toBeTruthy();
    expect(loadChoiceSeed('focus-form', 15)).toBe(first);
    expect(ensureChoiceSeed('focus-form', 15)).toBe(first);
    // คนละชุด = คนละ seed
    expect(ensureChoiceSeed('focus-form', 16)).not.toBe(first);
    expect(ensureChoiceSeed('listening', 15)).not.toBe(first);
  });

  it('seed ตัวเลือก: ทำชุดใหม่ = รอบใหม่ ได้ seed ใหม่', () => {
    const first = ensureChoiceSeed('focus-form', 17);
    const rotated = rotateChoiceSeed('focus-form', 17);
    expect(rotated).not.toBe(first);
    expect(loadChoiceSeed('focus-form', 17)).toBe(rotated);
    // seed ใหม่แล้ว การเรียก ensure ต้องไม่สร้างซ้ำ
    expect(ensureChoiceSeed('focus-form', 17)).toBe(rotated);
  });

  it('seed ตัวเลือก: sessionStorage ใช้ไม่ได้ → ยังคืน seed ไว้ใช้ในรอบนี้ ไม่ throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => ensureChoiceSeed('focus-form', 18)).not.toThrow();
    expect(ensureChoiceSeed('focus-form', 18)).toBeTruthy();
    expect(loadChoiceSeed('focus-form', 18)).toBeNull();
  });

  it('คำตอบของชุดเติมคำในบทความ (แยกคีย์จากตำแหน่งข้อ)', () => {
    expect(loadBlankAnswers('form-meaning', 31)).toEqual({});
    expect(saveBlankAnswers('form-meaning', 31, { 1: 'a', 2: '', 3: 'the' })).toBe(true);
    expect(loadBlankAnswers('form-meaning', 31)).toEqual({ 1: 'a', 3: 'the' });
    // ไม่ปนกับคีย์ของตำแหน่งข้อ
    expect(loadTestProgress('form-meaning', 31)).toBeNull();

    clearBlankAnswers('form-meaning', 31);
    expect(loadBlankAnswers('form-meaning', 31)).toEqual({});
  });
});
