import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/test-section-maintenance', () => ({
  isSectionInMaintenance: async () => false,
}));

import { DEMO_MAX_TOTAL, fetchMixedDemoQuestions } from './demo-set';

/**
 * ชุด demo ต้องเรียงตาม demoOrder ที่แอดมินตั้งทั้งชุด (ไม่สลับทักษะแบบ round-robin)
 * เทสต์นี้ล็อกสัญญาที่ทำให้พฤติกรรมนั้นเกิด: ยิงคิวรีเดียว เรียงด้วย demo_order
 * + id แล้วจำกัดที่ DEMO_MAX_TOTAL — ถ้ามีคนกลับไปดึงเป็นกองต่อทักษะแล้วสลับ
 * จำนวน select จะไม่ใช่ 1 และเทสต์จะ fail
 */
describe('fetchMixedDemoQuestions', () => {
  beforeEach(() => vi.clearAllMocks());

  function chain(rows: { id: number; testTypeId: string }[]) {
    const calls: { orderByArgs?: unknown[]; limit?: number } = {};
    const value = {
      from: () => value,
      where: () => value,
      orderBy: (...args: unknown[]) => {
        calls.orderByArgs = args;
        return value;
      },
      limit: (n: number) => {
        calls.limit = n;
        return Promise.resolve(rows);
      },
    };
    return { value, calls };
  }

  it('uses one ordered query for the whole mixed set', async () => {
    const rows = [
      { id: 2143, testTypeId: 'focus-form' },
      { id: 2144, testTypeId: 'focus-form' },
      { id: 1256, testTypeId: 'listening' },
    ];
    const { value, calls } = chain(rows);
    mocks.select.mockReturnValue(value);

    const result = await fetchMixedDemoQuestions();

    expect(mocks.select).toHaveBeenCalledTimes(1);
    // เรียงด้วย 2 คีย์: demo_order (NULLS LAST) แล้ว tie-break ด้วย id
    expect(calls.orderByArgs).toHaveLength(2);
    expect(calls.limit).toBe(DEMO_MAX_TOTAL);
    // ลำดับที่ DB ส่งกลับถูกส่งต่อทั้งชุด ไม่มีการสลับที่ฝั่งแอป
    expect(result.map((row) => row.id)).toEqual([2143, 2144, 1256]);
  });

  it('returns nothing when every demo skill is in maintenance', async () => {
    vi.resetModules();
    vi.doMock('@/lib/test-section-maintenance', () => ({
      isSectionInMaintenance: async () => true,
    }));
    const { fetchMixedDemoQuestions: fetchGuarded } = await import('./demo-set');

    expect(await fetchGuarded()).toEqual([]);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
