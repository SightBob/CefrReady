/**
 * POST /api/tests/full/start — ต้องคืน JSON เมื่อ DB พัง
 *
 * เดิม handler ไม่มี try/catch เมื่อโหนด throw จะได้ HTML 500 กลาง ๆ
 * ซึ่ง client ที่รอ { success, data } จะอ่านไม่ออก
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  origin: vi.fn(),
  ipThrottle: vi.fn(),
  userLimit: vi.fn(),
  dbError: null as unknown,
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({
  validateOrigin: mocks.origin,
  checkIpThrottle: mocks.ipThrottle,
  checkUserRateLimit: mocks.userLimit,
}));
vi.mock('@/lib/full-test/question-pool', () => ({
  getCachedQuestionPool: vi.fn(async () => [{ id: 1, cefrLevel: 'B1' }]),
  revalidateQuestionPool: () => {},
}));
vi.mock('@/lib/full-test/log-selection', () => ({
  determineSelectionMode: () => ({ mode: 'auto' }),
  logQuestionSelection: vi.fn(async () => undefined),
}));
vi.mock('@/db', () => ({
  db: {
    select: () => {
      if (mocks.dbError) throw mocks.dbError;
      const b: Record<string, unknown> = {};
      for (const m of ['from', 'where', 'limit', 'for']) b[m] = () => b;
      b.then = (res: (v: unknown) => unknown) => Promise.resolve([]).then(res);
      return b;
    },
    transaction: async (fn: (t: unknown) => Promise<unknown>) =>
      fn({
        select: () => {
          const b: Record<string, unknown> = {};
          for (const m of ['from', 'where', 'limit', 'for']) b[m] = () => b;
          b.then = (res: (v: unknown) => unknown) => Promise.resolve([]).then(res);
          return b;
        },
      }),
  },
}));

import { POST } from './route';

const req = () => new Request('http://localhost/api/tests/full/start', { method: 'POST' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dbError = null;
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.origin.mockReturnValue(null);
  mocks.ipThrottle.mockResolvedValue(null);
  mocks.userLimit.mockResolvedValue(null);
});

describe('POST /api/tests/full/start — จัดการ error', () => {
  it('DB throw ได้ JSON 500 ไม่ใช่ HTML', async () => {
    mocks.dbError = new Error('password authentication failed for user "prod_admin"');
    const res = await POST(req());

    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Failed to start test' });
  });

  it('ไม่หลุดรายละเอียดภายในของ error ให้ client', async () => {
    mocks.dbError = new Error('ECONNREFUSED 10.0.0.5:5432 secret-db-host');
    const text = await (await POST(req())).text();
    expect(text).not.toContain('ECONNREFUSED');
    expect(text).not.toContain('secret-db-host');
    expect(text).not.toContain('10.0.0.5');
  });

  it('ไม่มี session ได้ 401 เหมือนเดิม และไม่โยน error', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('origin ไม่ผ่านได้ 403 เหมือนเดิม', async () => {
    const denied = new Response('no', { status: 403 });
    mocks.origin.mockReturnValue(denied);
    expect(await POST(req())).toBe(denied);
  });

  it('โดน rate limit ได้ 429 เหมือนเดิม', async () => {
    const limited = new Response('limited', { status: 429 });
    mocks.userLimit.mockResolvedValue(limited);
    expect(await POST(req())).toBe(limited);
  });
});