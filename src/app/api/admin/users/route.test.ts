/**
 * GET /api/admin/users — ตัวแทนกลุ่ม CRUD ปกติ (โควตา 60/นาที)
 *
 * ยืนยันว่าการครอบด้วย withAdmin() ไม่เปลี่ยนพฤติกรรมเดิมของ route:
 * 401/403 ยังเหมือนเดิม และเพิ่ม 429 เมื่อเกินโควตา
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ withAdmin: vi.fn() }));
vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/db', () => ({ db: {} }));

import { GET, DELETE } from './route';

const req = () => ({ json: async () => ({}) }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
});

describe('admin CRUD route (withAdmin)', () => {
  it('ขอโควตา 60/นาที ด้วย key ของ route ตัวเอง', async () => {
    await GET(req());
    expect(mocks.withAdmin).toHaveBeenCalledWith({ keySuffix: 'admin:users', maxRequests: 60 });
  });

  it('เกินโควตาได้ 429 พร้อม Retry-After', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
        status: 429,
        headers: { 'Retry-After': '30' },
      }),
      session: null,
    });
    const res = await GET(req());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('ยังได้ 401 เมื่อไม่มี session เหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }), session: null });
    expect((await GET(req())).status).toBe(401);
  });

  it('ยังได้ 403 เมื่อไม่ใช่แอดมินเหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response('Forbidden - Admin access required', { status: 403 }),
      session: null,
    });
    expect((await DELETE(req())).status).toBe(403);
  });
});