/**
 * getThreadMessages — จำกัดจำนวนข้อความที่คืนให้ client
 *
 * เธรดยาวไม่จำกัดได้ (สะสมทุกวัน ล้างเมื่อกด reset เท่านั้น) → ต้องจำกัด
 * ไว้ที่ 100 ข้อความล่าสุด (เก่า→ใหม่)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import { getThreadMessages, THREAD_MESSAGE_LIMIT } from './messages';

let orderByArgs: unknown[][] = [];
let limitValue: number | null = null;

function stubRows(rows: unknown[]) {
  orderByArgs = [];
  limitValue = null;
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn((...args: unknown[]) => {
    orderByArgs.push(args);
    return chain;
  });
  chain.limit = vi.fn((value: number) => {
    limitValue = value;
    return Promise.resolve(rows);
  });
  mocks.select.mockReturnValue(chain);
}

beforeEach(() => {
  vi.clearAllMocks();
  stubRows([]);
});

describe('getThreadMessages', () => {
  it('จำกัดจำนวนข้อความไว้ที่ 100 ข้อความล่าสุด', async () => {
    await getThreadMessages({ userId: 'u1', questionId: 7 });
    expect(limitValue).toBe(THREAD_MESSAGE_LIMIT);
    expect(THREAD_MESSAGE_LIMIT).toBe(100);
  });

  it('เรียงจากใหม่ไปเก่าในคิวรี (เพื่อเอาของใหม่สุด 100) แล้วกลับลำดับเป็นเก่า→ใหม่ก่อนคืนค่า', async () => {
    const rows = [
      { id: 3, role: 'assistant', content: 'ใหม่สุด', status: 'ok', createdAt: new Date(3) },
      { id: 2, role: 'user', content: 'กลาง', status: 'ok', createdAt: new Date(2) },
      { id: 1, role: 'user', content: 'เก่าสุด', status: 'ok', createdAt: new Date(1) },
    ];
    stubRows(rows);

    const result = await getThreadMessages({ userId: 'u1', questionId: 7 });

    expect(result.map((message) => message.id)).toEqual([1, 2, 3]);
    expect(result[0].content).toBe('เก่าสุด');
    expect(orderByArgs).toHaveLength(1);
  });
});
