import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  checkIpThrottle: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('@/lib/api-security', () => ({ checkIpThrottle: mocks.checkIpThrottle }));
vi.mock('@/db', () => ({ db: { select: (...args: unknown[]) => mocks.select(...args) } }));

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy']) b[method] = vi.fn(() => b);
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { GET } from './route';

beforeEach(() => {
  mocks.dbError = null;
  mocks.checkIpThrottle.mockReset().mockResolvedValue(null);
  mocks.select.mockReset().mockReturnValue(builder([]));
});

describe('GET /api/verb-banks', () => {
  it('applies the verb-banks IP throttle before any query', async () => {
    const limited = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    mocks.checkIpThrottle.mockResolvedValue(limited);
    const response = await GET(new NextRequest('http://localhost/api/verb-banks'));
    expect(response).toBe(limited);
    expect(mocks.checkIpThrottle).toHaveBeenCalledWith(expect.anything(), {
      keySuffix: 'verb-banks',
      maxRequests: 60,
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('returns the entries ordered by id for the exam sidebar', async () => {
    mocks.select.mockReturnValue(builder([
      { id: 1, v1: 'go', v2: 'went', v3: 'gone' },
      { id: 2, v1: 'eat', v2: 'ate', v3: 'eaten' },
    ]));
    const response = await GET(new NextRequest('http://localhost/api/verb-banks'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(2);
    expect(body.data.map((v: { id: number }) => v.id)).toEqual([1, 2]);
  });

  it('returns 500 when the database is unavailable', async () => {
    mocks.dbError = new Error('connection reset');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await GET(new NextRequest('http://localhost/api/verb-banks'));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Failed to fetch verb bank' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
