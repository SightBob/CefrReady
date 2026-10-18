/**
 * POST /api/admin/questions/bulk-delete
 *
 * ก่อนหน้านี้หน้า admin ยิง Promise.all ทีละข้อ ซึ่งชนโควตา 60/นาที
 * เมื่อเลือกลบเกิน 60 ข้อ ทำให้ลบไม่ครบและเกิด 429 กลางคัน
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  withAdmin: vi.fn(),
  revalidateQuestionPool: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/lib/full-test/question-pool', () => ({ revalidateQuestionPool: mocks.revalidateQuestionPool }));
vi.mock('@/db', () => ({
  db: {
    delete: (...args: unknown[]) => mocks.delete(...args),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ delete: (...args: unknown[]) => mocks.delete(...args) }),
  },
}));

import { POST } from './route';

function builder(rows: unknown[]) {
  const b: Record<string, unknown> = {};
  b.where = vi.fn(() => b);
  b.returning = vi.fn(() => Promise.resolve(rows));
  return b;
}

const req = (body: unknown) => ({ json: async () => body }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.delete.mockReturnValue(builder([]));
});

describe('POST /api/admin/questions/bulk-delete', () => {
  it('ลบได้ 100 ข้อในคำขอเดียว', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    mocks.delete.mockReturnValue(builder(ids.map((id) => ({ id }))));

    const res = await POST(req({ ids }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(100);
    expect(body.data.notFound).toBe(0);
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });

  it('เกิน 200 ids ได้ 400 และไม่แตะฐานข้อมูล', async () => {
    const ids = Array.from({ length: 201 }, (_, i) => i + 1);
    const res = await POST(req({ ids }));
    expect(res.status).toBe(400);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('รับได้ครบ 200 พอดี', async () => {
    const ids = Array.from({ length: 200 }, (_, i) => i + 1);
    mocks.delete.mockReturnValue(builder(ids.map((id) => ({ id }))));
    expect((await POST(req({ ids }))).status).toBe(200);
  });

  it('ไม่ใช่แอดมินได้ 401 เหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }), session: null });
    expect((await POST(req({ ids: [1] }))).status).toBe(401);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('ไม่ใช่แอดมินได้ 403 เหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response('Forbidden - Admin access required', { status: 403 }),
      session: null,
    });
    expect((await POST(req({ ids: [1] }))).status).toBe(403);
  });

  it('เกินโควตาได้ 429', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
        status: 429,
        headers: { 'Retry-After': '40' },
      }),
      session: null,
    });
    const res = await POST(req({ ids: [1] }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('40');
  });

  it('คัดกรอง id ที่ไม่ใช่ตัวเลขและค่าซ้ำออกก่อนลบ', async () => {
    mocks.delete.mockReturnValue(builder([{ id: 3 }]));
    const res = await POST(req({ ids: [3, 3, 'x', null, -1, 5] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    // [3, 3, 'x', null, -1, 5] → เหลือ [3, 5]
    expect(body.data.requested).toBe(2);
    expect(body.data.deleted).toBe(1);
  });

  it('ids ว่างได้ 400', async () => {
    expect((await POST(req({ ids: [] }))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
  });

  it('คืนรายการ id ที่ลบจริง ให้ฝั่งหน้าเว็บอัปเดตรายการได้ตรงกับผลจริง', async () => {
    mocks.delete.mockReturnValue(builder([{ id: 4 }, { id: 9 }]));
    const body = await (await POST(req({ ids: [4, 9, 77] }))).json();
    expect(body.data.deletedIds).toEqual([4, 9]);
    expect(body.data.notFound).toBe(1);
  });

  it('ล้าง cache คลังข้อสอบเหมือนการลบทีละข้อ', async () => {
    mocks.delete.mockReturnValue(builder([{ id: 1 }, { id: 2 }]));
    await POST(req({ ids: [1, 2] }));
    expect(mocks.revalidateQuestionPool).toHaveBeenCalledTimes(1);
  });
});