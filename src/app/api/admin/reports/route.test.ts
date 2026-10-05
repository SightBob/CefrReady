import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), select: vi.fn(), queries: [] as string[], pending: 0, peak: 0, fail: false }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import { GET } from './route';

beforeEach(() => {
  mocks.queries = [];
  mocks.pending = 0;
  mocks.peak = 0;
  mocks.fail = false;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null });
  mocks.select.mockReset().mockImplementation(() => {
    let tableName = '';
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'groupBy', 'orderBy', 'limit', 'having', 'innerJoin']) {
      chain[method] = vi.fn((table?: Record<symbol, unknown>) => {
        if (method === 'from') tableName = String(table?.[Symbol.for('drizzle:Name')]);
        return chain;
      });
    }
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      mocks.queries.push(tableName);
      mocks.pending++;
      mocks.peak = Math.max(mocks.peak, mocks.pending);
      return new Promise((done, fail) => {
        setTimeout(() => {
          mocks.pending--;
          if (mocks.fail) fail(new Error('database unavailable'));
          else done([]);
        }, 0);
      }).then(resolve, reject);
    };
    return chain;
  });
});

describe('GET /api/admin/reports', () => {
  it('checks admin authorization before any query', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error });
    expect(await GET(new NextRequest('http://localhost/api/admin/reports'))).toBe(error);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('preserves the full empty report schema and starts independent queries concurrently', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/reports'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Object.keys(body.data)).toEqual([
      'overview', 'attemptsByType', 'attemptsOverTime', 'scoreDistribution', 'topPerformers',
      'questionAnalytics', 'userRetention', 'questionReports', 'cefrDistribution', 'attemptCountDistribution', 'fullTestAnalytics',
    ]);
    expect(body.data.overview).toEqual({ totalUsers: 0, totalAttempts: 0, overallAvgScore: 0 });
    expect(body.data.userRetention.totalRegisteredUsers).toBe(0);
    expect(body.data.cefrDistribution).toHaveLength(6);
    expect(body.data.attemptCountDistribution).toHaveLength(7);
    expect(body.data.fullTestAnalytics).toMatchObject({ totalAttempts: 0, avgScore: 0, recentAttempts: [] });
    expect(mocks.queries.filter(name => name === 'users')).toHaveLength(2); // total + new this month
    expect(mocks.peak).toBeGreaterThanOrEqual(5);
  });

  it('returns the existing error response if a query fails', async () => {
    mocks.fail = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await GET(new NextRequest('http://localhost/api/admin/reports'));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Failed to fetch reports' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
