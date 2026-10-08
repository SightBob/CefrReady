import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  select: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({ db: { select: (...args: unknown[]) => mocks.select(...args) } }));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'leftJoin', 'where', 'groupBy', 'orderBy', 'limit']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { GET } from './route';

/** แถวดิบแบบที่ pg ส่งกลับจริง — SUM/COUNT ของ integer มาเป็น string */
const rawRows = [
  { userId: 'u1', userName: 'สมชาย', userEmail: 'a@test.dev', totalPoints: '100', totalReasons: '4', scoredReasons: '2', lastScoredAt: '2026-10-07T02:00:00.000Z' },
  { userId: 'u2', userName: 'สมศรี', userEmail: 'b@test.dev', totalPoints: '100', totalReasons: '3', scoredReasons: '2', lastScoredAt: null },
  { userId: 'u3', userName: null, userEmail: 'c@test.dev', totalPoints: '0', totalReasons: '1', scoredReasons: '1', lastScoredAt: '2026-10-06T10:00:00.000Z' },
];

beforeEach(() => {
  mocks.dbError = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null, session: null });
  mocks.select.mockReset().mockReturnValue(builder(rawRows));
});

describe('GET /api/admin/tap-reasons/leaderboard', () => {
  it('returns the requireAdmin error without querying', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await GET()).toBe(error);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('converts pg string aggregates to numbers and keeps display names', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data[0]).toMatchObject({ userId: 'u1', totalPoints: 100, totalReasons: 4, scoredReasons: 2 });
    expect(typeof data[0].totalPoints).toBe('number');
    expect(data[2]).toMatchObject({ userName: null, totalPoints: 0 });
  });

  it('gives tied scores the same rank and skips the following rank', async () => {
    const { data } = await (await GET()).json();
    expect(data.map((row: { rank: number }) => row.rank)).toEqual([1, 1, 3]);
  });

  it('still lists a learner whose reasons are all pending, with 0 points', async () => {
    mocks.select.mockReturnValue(
      builder([
        { userId: 'u9', userName: 'รอตรวจ', userEmail: 'd@test.dev', totalPoints: '0', totalReasons: '2', scoredReasons: '0', lastScoredAt: null },
      ])
    );
    const { data } = await (await GET()).json();
    expect(data).toEqual([
      { rank: 1, userId: 'u9', userName: 'รอตรวจ', userEmail: 'd@test.dev', totalPoints: 0, totalReasons: 2, scoredReasons: 0, lastScoredAt: null },
    ]);
  });

  it('returns an empty list when nobody has written a reason yet', async () => {
    mocks.select.mockReturnValue(builder([]));
    expect(await (await GET()).json()).toEqual({ success: true, data: [] });
  });

  it('returns 500 without leaking database errors', async () => {
    mocks.dbError = new Error('password authentication failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await GET();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to fetch reward leaderboard' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
