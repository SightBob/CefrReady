import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), enabled: vi.fn() }));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/ai-tutor', () => ({ isAiTutorEnabled: mocks.enabled }));
import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.enabled.mockResolvedValue(false);
});

describe('GET /api/tests/ai-tutor-access', () => {
  it('ไม่ล็อกอิน → 401', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.enabled).not.toHaveBeenCalled();
  });

  it('ธงปิด → enabled false โดยไม่มีข้อความเงื่อนไข env ออกไป', async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, enabled: false });
  });

  it('ธงเปิด → enabled true', async () => {
    mocks.enabled.mockResolvedValue(true);
    const body = await (await GET()).json();
    expect(body).toEqual({ success: true, enabled: true });
  });

  it('เรียกด้วย ?tutor=1 ก็ตาม คำตอบขึ้นกับเซสชันเท่านั้น — query ไม่มีสิทธิ์พาให้เห็น', async () => {
    mocks.enabled.mockResolvedValue(true);
    const body = await (await GET()).json();
    expect(body.enabled).toBe(true);
    expect(mocks.auth).toHaveBeenCalledTimes(1);
  });

  it('ฐานข้อมูลใช้ไม่ได้ → 503 พร้อมข้อความที่อ่านรู้เรื่อง (ไม่ใช่ 500)', async () => {
    mocks.enabled.mockRejectedValue(new Error('column "ai_tutor_access" does not exist'));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
  });
});
