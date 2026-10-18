/**
 * ตัวป้องกัน race ของ request ที่ผู้เรียนสลับชุดข้อสอบเร็ว ๆ
 *
 * ปัญหา: สลับชุดแล้ว response ของชุดเก่ามาช้ากว่า จะทับ state ของชุดใหม่
 * แก้ด้วย 2 ชั้น — AbortController ตัด request เก่อนทิ้ง และเลขรอบ
 * เพื่อกันเผื่อ response เก่าถูกยิงไปแล้วแต่ยังกลับมาทีหลัง
 */
import { describe, expect, it } from 'vitest';

import { createLatestRequestGuard, isAbortError } from './latest-request';

describe('createLatestRequestGuard', () => {
  it('ขอรอบใหม่ = ยกเลิกรอบก่อนหน้าทันที', () => {
    const guard = createLatestRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });

  it('เฉพาะรอบล่าสุดเท่านั้นที่ยังเป็นรอบปัจจุบัน', () => {
    const guard = createLatestRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
  });

  it('สลับ 3 รอบ — รอบเก่าสุด 2 รอบไม่ใช่ปัจจุบัน', () => {
    const guard = createLatestRequestGuard();
    const a = guard.begin();
    const b = guard.begin();
    const c = guard.begin();

    expect([a.isCurrent(), b.isCurrent(), c.isCurrent()]).toEqual([false, false, true]);
  });

  it('abort() ยกเลิกรอบปัจจุบัน (ใช้ตอน unmount)', () => {
    const guard = createLatestRequestGuard();
    const current = guard.begin();
    guard.abort();
    expect(current.signal.aborted).toBe(true);
  });

  it('เก็บข้อมูลของชุด B ไว้ เมื่อ response ของชุด A มาช้ากว่า', () => {
    const guard = createLatestRequestGuard();
    const state = { setId: null as number | null };

    // สลับจากชุด 1 → ชุด 2 รอบ A ยังค้างอยู่
    const a = guard.begin();
    const b = guard.begin();

    // response ของชุด 2 มาก่อน
    if (b.isCurrent()) state.setId = 2;
    // แล้ว response ของชุด 1 ค่อยมาทีหลัง — ต้องถูกทิ้ง
    if (a.isCurrent()) state.setId = 1;

    expect(state.setId).toBe(2);
    expect(a.signal.aborted).toBe(true);
  });

  it('แต่ละ instance แยกกัน ไม่รบกวนกัน', () => {
    const guardA = createLatestRequestGuard();
    const guardB = createLatestRequestGuard();
    const requestB = guardB.begin();
    guardA.begin();

    expect(requestB.isCurrent()).toBe(true);
    expect(requestB.signal.aborted).toBe(false);
  });
});

describe('isAbortError', () => {
  it('จับทั้ง DOMException AbortError และ error ที่ตั้งชื่อ AbortError', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it('ไม่จับ error ปกติ', () => {
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
  });
});