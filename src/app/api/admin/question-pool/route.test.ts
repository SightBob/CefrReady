/**
 * GET /api/admin/question-pool — ตัวแทนกลุ่ม endpoint หนัก (โควตา 20/นาที)
 *
 * ยืนยันว่า route ที่ดึงข้อมูลเยอะได้ 429 เมื่อเกินโควตา และยังคืน 401/403
 * เหมือนเดิมเมื่อสิทธิ์ไม่ผ่าน
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ withAdmin: vi.fn() }));
vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/db', () => ({ db: {} }));

import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
});

describe('admin heavy route (withAdmin)', () => {
  it('ขอโควตา 20/นาที', async () => {
    await GET({} as never);
    expect(mocks.withAdmin).toHaveBeenCalledWith({
      keySuffix: 'admin:question-pool',
      maxRequests: 20,
    });
  });

  it('เกินโควตาได้ 429', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
        status: 429,
        headers: { 'Retry-After': '25' },
      }),
      session: null,
    });
    const res = await GET({} as never);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('25');
  });

  it('ยังได้ 401 เมื่อไม่มี session', async () => {
    mocks.withAdmin.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }), session: null });
    expect((await GET({} as never)).status).toBe(401);
  });
});