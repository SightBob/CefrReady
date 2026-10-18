/**
 * Wrapper กลางสำหรับ admin route: ตรวจสิทธิ์แอดมินเดิม + rate limit
 *
 * requireAdmin() เดิมไม่จำกัดโควตาเลย — admin route ทั้ง 46 ตัวยิงซ้ำได้ไม่จำกัด
 * export ยิงซ้ำแล้วดึง attempt 5,000 แถวพร้อมชื่อ-อีเมลผู้เรียนทุกครั้ง
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), userLimit: vi.fn() }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.userLimit }));

import { withAdmin } from './admin-route';

const OPTIONS = { keySuffix: 'admin-export', maxRequests: 5, windowMs: 5 * 60_000 };

function ok() {
  return { error: null, session: { user: { id: 'admin-1', email: 'a@b.c' } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue(ok());
  mocks.userLimit.mockResolvedValue(null);
});

describe('withAdmin', () => {
  it('ผ่านเมื่อเป็นแอดมินและยังไม่เกินโควตา', async () => {
    const { error, session } = await withAdmin(OPTIONS);
    expect(error).toBeNull();
    expect(session?.user.id).toBe('admin-1');
  });

  it('เกินโควตาได้ 429 พร้อม Retry-After', async () => {
    mocks.userLimit.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
        status: 429,
        headers: { 'Retry-After': '120' },
      })
    );
    const { error } = await withAdmin(OPTIONS);
    expect(error?.status).toBe(429);
    expect(error?.headers.get('Retry-After')).toBe('120');
  });

  it('ส่งตัวเลือกเข้มไปให้ checkUserRateLimit ตาม key ของ route', async () => {
    await withAdmin(OPTIONS);
    expect(mocks.userLimit).toHaveBeenCalledWith('admin-1', OPTIONS);
  });

  it('ไม่ยิง rate limit ถ้ายังไม่ผ่านการตรวจสิทธิ์', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: new Response('no', { status: 401 }), session: null });
    const { error } = await withAdmin(OPTIONS);
    expect(error?.status).toBe(401);
    expect(mocks.userLimit).not.toHaveBeenCalled();
  });
});