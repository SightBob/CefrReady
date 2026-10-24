/**
 * GET /api/admin/ai-tutor/usage — สถิติการใช้งานวันนี้ (อ่านอย่างเดียว)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  withAdmin: vi.fn(),
  getAiTutorConfig: vi.fn(),
  getAiTutorUsageSnapshot: vi.fn(),
}));

vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/lib/ai-tutor/config', () => ({ getAiTutorConfig: mocks.getAiTutorConfig }));
vi.mock('@/lib/ai-tutor/usage', () => ({ getAiTutorUsageSnapshot: mocks.getAiTutorUsageSnapshot }));

import { GET } from './route';

const SNAPSHOT = {
  dayStart: '2026-10-23T17:00:00.000Z',
  resetAt: '2026-10-24T17:00:00.000Z',
  questions: 1240,
  answers: 1180,
  failed: 12,
  learners: 87,
  pending: 2,
  lastActivityAt: '2026-10-24T09:15:00.000Z',
  topLearners: [
    { userId: 'u1', email: 'heavy@example.com', name: 'ผู้เรียนหนัก', count: 42 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.getAiTutorUsageSnapshot.mockResolvedValue(SNAPSHOT);
  mocks.getAiTutorConfig.mockResolvedValue({
    runtimeEnabled: true,
    systemDailyLimit: 10_000,
    userDailyLimit: 50,
    questionQuota: 10,
  });
});

describe('GET /api/admin/ai-tutor/usage', () => {
  it('ไม่ใช่แอดมิน → ส่งต่อ error จาก withAdmin (401/403)', async () => {
    const denied = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    mocks.withAdmin.mockResolvedValue({ error: denied, session: null });

    const res = await GET();
    expect(res.status).toBe(403);
    expect(mocks.getAiTutorUsageSnapshot).not.toHaveBeenCalled();
  });

  it('คืนสถิติ + เพดานที่ใช้งานจริง (DB ทับ env) เพื่อให้หน้าจอเทียบถูก', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      questions: 1240,
      answers: 1180,
      failed: 12,
      learners: 87,
      pending: 2,
      limits: { systemDailyLimit: 10_000, userDailyLimit: 50, questionQuota: 10 },
      runtimeEnabled: true,
    });
    expect(body.data.topLearners).toHaveLength(1);
    expect(body.data.topLearners[0]).toMatchObject({ email: 'heavy@example.com', count: 42 });
  });

  it('ห้าม cache — ตัวเลขต้องสดทุกครั้งที่หน้าจอเรียก', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('ฐานข้อมูล/ตารางยังไม่มี → 503 พร้อมข้อความที่ผู้ดูแลเข้าใจ', async () => {
    mocks.getAiTutorUsageSnapshot.mockRejectedValue(
      new Error('relation "ai_tutor_messages" does not exist'),
    );

    const res = await GET();
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('ยังไม่ได้รัน migration ของ AI Tutor');
    // ไม่เผยรายละเอียด error ภายในออกไป
    expect(JSON.stringify(body)).not.toContain('ai_tutor_messages');
  });
});
