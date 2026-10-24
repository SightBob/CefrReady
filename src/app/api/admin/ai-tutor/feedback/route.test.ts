/**
 * GET /api/admin/ai-tutor/feedback — 👍/👎 ของผู้เรียน (อ่านอย่างเดียว)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  withAdmin: vi.fn(),
  getAiTutorFeedbackSummary: vi.fn(),
}));

vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/lib/ai-tutor/admin-feedback', () => ({ getAiTutorFeedbackSummary: mocks.getAiTutorFeedbackSummary }));

import { GET } from './route';

function get(query = '') {
  return GET(new Request(`http://localhost:3000/api/admin/ai-tutor/feedback${query}`) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.getAiTutorFeedbackSummary.mockResolvedValue({
    days: 30,
    up: 8,
    down: 2,
    total: 10,
    downvoted: [
      {
        messageId: 42,
        votedAt: new Date('2026-10-22T09:00:00.000Z'),
        content: 'คำตอบที่ถูกกด 👎',
        model: 'openai/gpt-4o-mini',
        questionText: 'ข้อความโจทย์',
        grammarTopic: 'some',
        cefrLevel: 'A2',
      },
    ],
  });
});

describe('GET /api/admin/ai-tutor/feedback', () => {
  it('ไม่ใช่แอดมิน → ส่งต่อ error จาก withAdmin โดยไม่อ่านข้อมูล', async () => {
    const denied = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    mocks.withAdmin.mockResolvedValue({ error: denied, session: null });

    const res = await get();
    expect(res.status).toBe(403);
    expect(mocks.getAiTutorFeedbackSummary).not.toHaveBeenCalled();
  });

  it('ค่าเริ่มต้น 30 วัน', async () => {
    await get();
    expect(mocks.getAiTutorFeedbackSummary).toHaveBeenCalledWith(30);
  });

  it('อ่านช่วงเวลาจาก query และ clamp ค่าที่ผิด', async () => {
    await get('?days=7');
    expect(mocks.getAiTutorFeedbackSummary).toHaveBeenLastCalledWith(7);

    await get('?days=9999');
    expect(mocks.getAiTutorFeedbackSummary).toHaveBeenLastCalledWith(365);

    await get('?days=abc');
    expect(mocks.getAiTutorFeedbackSummary).toHaveBeenLastCalledWith(30);

    await get('?days=-3');
    expect(mocks.getAiTutorFeedbackSummary).toHaveBeenLastCalledWith(30);
  });

  it('คืนสรุป + รายการ 👎 และห้าม cache', async () => {
    const res = await get();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.data).toMatchObject({ days: 30, up: 8, down: 2, total: 10 });
    expect(body.data.downvoted[0]).toMatchObject({
      messageId: 42,
      model: 'openai/gpt-4o-mini',
      grammarTopic: 'some',
    });
    expect(body.data.downvoted[0].votedAt).toBe('2026-10-22T09:00:00.000Z');
  });

  it('ตารางยังไม่มี (migration ยังไม่รัน) → 503 โดยไม่เผย error ภายใน', async () => {
    mocks.getAiTutorFeedbackSummary.mockRejectedValue(
      new Error('relation "ai_tutor_feedback" does not exist'),
    );

    const res = await get();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toContain('ยังไม่ได้รัน migration ของ AI Tutor');
    expect(JSON.stringify(body)).not.toContain('ai_tutor_feedback');
  });
});
