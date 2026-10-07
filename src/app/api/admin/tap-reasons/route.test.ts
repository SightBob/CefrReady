import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mocks.select(...args),
    update: (...args: unknown[]) => mocks.update(...args),
  },
}));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy', 'limit', 'set', 'returning']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { GET, PATCH } from './route';

const url = (query = '') => new NextRequest(`http://localhost/api/admin/tap-reasons${query}`);
const patchRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/tap-reasons', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const sampleRow = {
  id: 1,
  userId: 'u1',
  itemIndex: 0,
  reason: 'She เป็นเอกพจน์',
  rewardPoints: null,
};

beforeEach(() => {
  mocks.dbError = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null, session: null });
  mocks.select.mockReset().mockReturnValue(builder([sampleRow]));
  mocks.update.mockReset().mockReturnValue(builder([{ id: 1, rewardPoints: 5 }]));
});

describe('GET /api/admin/tap-reasons', () => {
  it('returns the requireAdmin error without querying', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await GET(url())).toBe(error);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('filters unscored rows in SQL (default view)', async () => {
    const response = await GET(url());
    expect(response.status).toBe(200);
    // กรองที่ where ไม่ใช่หลัง limit — รายการเก่าที่ค้างอยู่ต้องไม่หายจากหน้าจอ
    const chain = mocks.select.mock.results[0].value as { where: ReturnType<typeof vi.fn> };
    expect(chain.where).toHaveBeenCalledTimes(1);
    expect(chain.where.mock.calls[0][0]).toBeDefined();
    expect((await response.json()).data).toEqual([sampleRow]);
  });

  it('does not filter when scored=true', async () => {
    const response = await GET(url('?scored=true'));
    const chain = mocks.select.mock.results[0].value as { where: ReturnType<typeof vi.fn> };
    expect(chain.where.mock.calls[0][0]).toBeUndefined();
    expect((await response.json()).data).toEqual([sampleRow]);
  });

  it('returns 500 without leaking database errors', async () => {
    mocks.dbError = new Error('password authentication failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await GET(url());
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to fetch tap reasons' });
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('PATCH /api/admin/tap-reasons', () => {
  it('rejects rewardPoints outside 0-100 or non-integers', async () => {
    for (const rewardPoints of [101, -1, 1.5, '5']) {
      const response = await PATCH(patchRequest({ id: 1, rewardPoints }));
      expect(response.status).toBe(400);
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects a missing/invalid id', async () => {
    expect((await PATCH(patchRequest({ rewardPoints: 3 }))).status).toBe(400);
    expect((await PATCH(patchRequest({ id: 0, rewardPoints: 3 }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('sets the score and stamps scoredAt', async () => {
    const response = await PATCH(patchRequest({ id: 1, rewardPoints: 5 }));
    expect(response.status).toBe(200);
    const setArg = (mocks.update.mock.results[0].value as { set: ReturnType<typeof vi.fn> }).set.mock.calls[0][0] as {
      rewardPoints: number | null;
      scoredAt: Date | null;
    };
    expect(setArg.rewardPoints).toBe(5);
    expect(setArg.scoredAt).toBeInstanceOf(Date);
    expect(await response.json()).toEqual({ success: true, data: { id: 1, rewardPoints: 5 } });
  });

  it('clears the score and scoredAt when rewardPoints is null', async () => {
    mocks.update.mockReturnValue(builder([{ id: 1, rewardPoints: null }]));
    const response = await PATCH(patchRequest({ id: 1, rewardPoints: null }));
    const setArg = (mocks.update.mock.results[0].value as { set: ReturnType<typeof vi.fn> }).set.mock.calls[0][0] as {
      rewardPoints: number | null;
      scoredAt: Date | null;
    };
    expect(setArg).toEqual({ rewardPoints: null, scoredAt: null });
    expect(await response.json()).toEqual({ success: true, data: { id: 1, rewardPoints: null } });
  });

  it('returns 404 when the row does not exist', async () => {
    mocks.update.mockReturnValue(builder([]));
    expect((await PATCH(patchRequest({ id: 999, rewardPoints: 5 }))).status).toBe(404);
  });

  it('returns the requireAdmin error without writing', async () => {
    const error = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await PATCH(patchRequest({ id: 1, rewardPoints: 5 }))).toBe(error);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
