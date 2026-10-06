import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), select: vi.fn(), pending: 0, peak: 0, calls: [] as string[] }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.admin }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
import { GET } from './route';
beforeEach(() => {
  mocks.pending = 0; mocks.peak = 0; mocks.calls = [];
  mocks.admin.mockReset().mockResolvedValue({ error: null });
  mocks.select.mockReset().mockImplementation(() => {
    let name = ''; const b: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'innerJoin', 'groupBy', 'orderBy', 'limit']) b[method] = (table?: Record<symbol, unknown>) => {
      if (method === 'from') name = String(table?.[Symbol.for('drizzle:Name')]); return b;
    };
    b.then = (resolve: (value: unknown) => unknown) => {
      mocks.calls.push(name); mocks.pending++; mocks.peak = Math.max(mocks.peak, mocks.pending);
      return new Promise(done => setTimeout(() => {
        mocks.pending--; done(name === 'questions' ? [{ count: 10, activeCount: 7 }] : name === 'test_types' ? [{ count: 4 }] : name === 'users' ? [{ count: 20 }] : [{ questionId: 2, questionText: 'Q', wrongCount: 3 }]);
      }, 5)).then(resolve);
    }; return b;
  });
});
describe('admin stats query performance', () => {
  it('requires admin before starting any query', async () => {
    const error = NextResponse.json({}, { status: 403 }); mocks.admin.mockResolvedValue({ error });
    expect(await GET(new NextRequest('http://localhost/api/admin/stats'))).toBe(error); expect(mocks.select).not.toHaveBeenCalled();
  });
  it('preserves values with four queries, only one questions scan and peak concurrency three', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/stats'));
    expect(await response.json()).toEqual({ totalQuestions: 10, activeQuestions: 7, totalTests: 4, totalUsers: 20, hardestQuestions: [{ questionId: 2, questionText: 'Q', wrongCount: 3 }] });
    expect(mocks.calls).toEqual(['questions', 'test_types', 'users', 'user_answers']); expect(mocks.peak).toBe(3);
  });
});
