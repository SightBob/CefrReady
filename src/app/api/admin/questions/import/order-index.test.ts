/**
 * Regression tests for test-set ordering on import.
 *
 * The bug: the import loop derived orderIndex from a COUNT(*) query that ran
 * before the bulk insert, so every row targeting the same set received the same
 * orderIndex. These tests pin the allocator that replaced it.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ questions: {}, testSetQuestions: {}, testSets: {} }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: null }) }));

import { allocateOrderIndex } from './route';

describe('allocateOrderIndex', () => {
  it('เริ่มที่ 0 และเพิ่มทีละ 1 เมื่อชุดยังว่าง (maxOrder = null)', () => {
    const state = new Map<number, number>();
    expect(allocateOrderIndex(state, 3, null)).toBe(0);
    expect(allocateOrderIndex(state, 3, null)).toBe(1);
    expect(allocateOrderIndex(state, 3, null)).toBe(2);
  });

  it('import 3 ข้อเข้าชุดเดียวกัน ได้ orderIndex ต่อเนื่อง ไม่ซ้ำ', () => {
    const state = new Map<number, number>();
    const order = [0, 1, 2].map(() => allocateOrderIndex(state, 7, null));
    expect(order).toEqual([0, 1, 2]);
    expect(new Set(order).size).toBe(3);
  });

  it('รอบสองต่อจากเลขท้ายเดิมของชุดนั้น', () => {
    // รอบแรกได้ 0,1,2 → maxOrder ที่ DB ต้องเป็น 2
    const firstRun = new Map<number, number>();
    [0, 1, 2].forEach(() => allocateOrderIndex(firstRun, 7, null));

    // รอบสอง: preload max = 2 → ต้องเริ่มที่ 3
    const secondRun = new Map<number, number>();
    expect(allocateOrderIndex(secondRun, 7, 2)).toBe(3);
    expect(allocateOrderIndex(secondRun, 7, 2)).toBe(4);
  });

  it('แต่ละชุดนับแยกกัน', () => {
    const state = new Map<number, number>();
    expect(allocateOrderIndex(state, 1, null)).toBe(0);
    expect(allocateOrderIndex(state, 2, null)).toBe(0);
    expect(allocateOrderIndex(state, 1, null)).toBe(1);
    expect(allocateOrderIndex(state, 2, null)).toBe(1);
  });

  it('maxOrder ที่ไม่ต่อเนื่อง (มีช่องว่าง) ยังเริ่มต่อท้ายจริง', () => {
    // ชุดมี orderIndex 0,1,5 → max = 5 → รอบถัดไปต้องเป็น 6 ไม่ใช่ 3
    const state = new Map<number, number>();
    expect(allocateOrderIndex(state, 7, 5)).toBe(6);
  });

  it('ไม่แก้ state ของชุดอื่น', () => {
    const state = new Map<number, number>();
    allocateOrderIndex(state, 1, null);
    allocateOrderIndex(state, 9, null);
    expect(state.get(1)).toBe(1);
    expect(state.get(9)).toBe(1);
  });
});