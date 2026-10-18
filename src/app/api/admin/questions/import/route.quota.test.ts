/**
 * แยกโควตาของ /api/admin/questions/import ระหว่าง GET (เทมเพลต) กับ POST (นำเข้าจริง)
 *
 * หน้า import ยิง 3 คำขอต่อ 1 รอบ (GET เทมเพลต, POST dryRun, POST จริง)
 * เดิมทั้งหมดนับรวมกันที่ 5/5 นาที ทำให้ทำได้ราว 1 รอบต่อ 5 นาที
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ withAdmin: vi.fn() }));
vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: { user: { id: 'a' } } }) }));
vi.mock('@/db', () => ({ db: {} }));

import { GET, POST } from './route';

const req = () => ({ json: async () => ({ csvData: '', dryRun: true }) }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
});

const limited = () =>
  new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
    status: 429,
    headers: { 'Retry-After': '120' },
  });

describe('แยกโควตา GET เทมเพลต กับ POST นำเข้า', () => {
  it('GET ใช้ 60/นาที คนละ key กับ POST', async () => {
    await GET();
    expect(mocks.withAdmin).toHaveBeenCalledWith({
      keySuffix: 'admin:questions:import:template',
      maxRequests: 60,
    });
  });

  it('POST ใช้ 10 ครั้ง / 5 นาที', async () => {
    await POST(req());
    expect(mocks.withAdmin).toHaveBeenCalledWith({
      keySuffix: 'admin:questions:import',
      maxRequests: 10,
      windowMs: 300_000,
    });
  });

  it('GET ซ้ำ 6 ครั้งยังไม่ชน 429 (ถ้าเกินต้องเป็น 61)', async () => {
    for (let i = 0; i < 6; i++) {
      expect((await GET()).status).toBe(200);
    }
    expect(mocks.withAdmin).toHaveBeenCalledTimes(6);
  });

  it('GET เกินโควตาได้ 429', async () => {
    mocks.withAdmin.mockResolvedValue({ error: limited(), session: null });
    const res = await GET();
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('120');
  });

  it('POST เกิน 10 ครั้งได้ 429', async () => {
    mocks.withAdmin.mockResolvedValue({ error: limited(), session: null });
    expect((await POST(req())).status).toBe(429);
  });

  it('POST ที่ยังไม่เกินโควตายังทำงานตามเดิม (dryRun ต้องผ่าน validation)', async () => {
    const res = await POST(req());
    // csvData ว่าง → 400 ตาม validation เดิม แปลว่าไม่ได้ถูก rate limit บล็อก
    expect(res.status).toBe(400);
  });
});