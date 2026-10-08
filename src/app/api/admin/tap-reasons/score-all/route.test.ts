import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  settings: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/tap-reason-settings', () => ({ getTapReasonRewardSettings: mocks.settings }));
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mocks.select(...args),
    update: (...args: unknown[]) => mocks.update(...args),
  },
}));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'limit', 'set']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { POST } from './route';

beforeEach(() => {
  mocks.dbError = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null, session: null });
  mocks.settings.mockReset().mockResolvedValue({ autoAward: true, points: 50 });
  mocks.select.mockReset().mockReturnValue(builder([{ id: 7 }, { id: 8 }]));
  mocks.update.mockReset().mockReturnValue(builder(undefined));
});

describe('POST /api/admin/tap-reasons/score-all', () => {
  it('returns the requireAdmin error without touching the database', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await POST()).toBe(error);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('refuses to backfill while flat scoring is turned off', async () => {
    mocks.settings.mockResolvedValue({ autoAward: false, points: 50 });
    const response = await POST();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: 'เปิดให้คะแนนอัตโนมัติก่อน จึงจะให้คะแนนย้อนหลังได้',
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns 503 when the stored settings cannot be read', async () => {
    mocks.settings.mockRejectedValue(new Error('redis down'));
    const response = await POST();
    expect(response.status).toBe(503);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('gives the flat score to every pending row and stamps scoredAt', async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    const setArg = (mocks.update.mock.results[0].value as { set: ReturnType<typeof vi.fn> }).set.mock
      .calls[0][0] as { rewardPoints: number; scoredAt: Date };
    expect(setArg.rewardPoints).toBe(50);
    expect(setArg.scoredAt).toBeInstanceOf(Date);
    expect(await response.json()).toEqual({
      success: true,
      data: { scored: 2, points: 50, remaining: false },
    });
  });

  it('does not write anything when no row is pending', async () => {
    mocks.select.mockReturnValue(builder([]));
    const response = await POST();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      success: true,
      data: { scored: 0, points: 50, remaining: false },
    });
  });

  it('flags remaining work when the per-request cap is hit', async () => {
    mocks.select.mockReturnValue(builder(Array.from({ length: 500 }, (_, index) => ({ id: index + 1 }))));
    expect(await (await POST()).json()).toEqual({
      success: true,
      data: { scored: 500, points: 50, remaining: true },
    });
  });

  it('returns 500 without leaking database errors', async () => {
    mocks.dbError = new Error('password authentication failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await POST();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Failed to backfill reward points' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
