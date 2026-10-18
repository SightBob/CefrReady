/**
 * GET /api/tests/full/resume — ต้องคืน JSON เมื่อ DB พัง
 *
 * เดิม handler ไม่มี try/catch เมื่อโหนด throw จะได้ HTML 500 กลาง ๆ
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
vi.mock('@/db', () => ({
  db: {
    select: () => {
      if (mocks.dbError) throw mocks.dbError;
      const b: Record<string, unknown> = {};
      for (const m of ['from', 'where', 'limit', 'orderBy', 'for']) b[m] = () => b;
      b.then = (res: (v: unknown) => unknown) => Promise.resolve([]).then(res);
      return b;
    },
  },
}));

import { GET } from './route';

const req = () => new Request('http://localhost/api/tests/full/resume');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dbError = null;
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.origin.mockReturnValue(null);
  mocks.ipThrottle.mockResolvedValue(null);
  mocks.userLimit.mockResolvedValue(null);
});

describe('GET /api/tests/full/resume — จัดการ error', () => {
  it('DB throw ได้ JSON 500 ไม่ใช่ HTML', async () => {
    mocks.dbError = new Error('password authentication failed for user "prod_admin"');
    const res = await GET(req());

    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ success: false, error: 'Failed to resume test' });
  });

  it('ไม่หลุดรายละเอียดภายในของ error ให้ client', async () => {
    mocks.dbError = new Error('ECONNREFUSED 10.0.0.5:5432 secret-db-host');
    const text = await (await GET(req())).text();
    expect(text).not.toContain('ECONNREFUSED');
    expect(text).not.toContain('secret-db-host');
    expect(text).not.toContain('10.0.0.5');
  });

  it('ไม่มี session ได้ 401 เหมือนเดิม', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('โดน rate limit ได้ 429 เหมือนเดิม', async () => {
    const limited = new Response('limited', { status: 429 });
    mocks.userLimit.mockResolvedValue(limited);
    expect(await GET(req())).toBe(limited);
  });
});