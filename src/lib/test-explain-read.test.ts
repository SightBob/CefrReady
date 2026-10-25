// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  markSetExplainRead,
  wasSetExplainRead,
  clearSetExplainRead,
  canTrackSetExplainRead,
} from './test-explain-read';

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('test-explain-read', () => {
  it('mark → was = true และ clear แล้วกลับเป็น false', () => {
    expect(wasSetExplainRead('focus-form', 15)).toBe(false);
    markSetExplainRead('focus-form', 15);
    expect(wasSetExplainRead('focus-form', 15)).toBe(true);
    clearSetExplainRead('focus-form', 15);
    expect(wasSetExplainRead('focus-form', 15)).toBe(false);
  });

  it('แยกกันต่อ section/set', () => {
    markSetExplainRead('focus-form', 15);
    expect(wasSetExplainRead('focus-form', 16)).toBe(false);
    expect(wasSetExplainRead('listening', 15)).toBe(false);
  });

  it('canTrackSetExplainRead = true เมื่อ sessionStorage ใช้ได้', () => {
    expect(canTrackSetExplainRead()).toBe(true);
    // probe ต้องไม่ทิ้งขยะไว้ใน storage
    expect(window.sessionStorage.length).toBe(0);
  });

  /**
   * ถ้า sessionStorage ถูกบล็อก (private mode) การเด้งไปหน้า /explain จะกลายเป็น
   * ลูปไม่จบ — หน้าข้อสอบจึงต้องรู้ล่วงหน้าว่าเก็บ flag ไม่ได้
   */
  it('canTrackSetExplainRead = false เมื่อ sessionStorage เขียนไม่ได้', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(canTrackSetExplainRead()).toBe(false);
  });

  it('อ่าน/เขียนพลาดแล้วไม่ throw ออกมา', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markSetExplainRead('focus-form', 15)).not.toThrow();
    expect(wasSetExplainRead('focus-form', 15)).toBe(false);
    expect(() => clearSetExplainRead('focus-form', 15)).not.toThrow();
  });
});
