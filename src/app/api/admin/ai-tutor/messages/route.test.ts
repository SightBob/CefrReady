/**
 * GET /api/admin/ai-tutor/messages — คำถาม/คำตอบของผู้เรียน (อ่านอย่างเดียว)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  withAdmin: vi.fn(),
  listAiTutorMessages: vi.fn(),
}));

vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/lib/ai-tutor/admin-messages', () => ({ listAiTutorMessages: mocks.listAiTutorMessages }));

import { GET } from './route';

function get(query = '') {
  return GET(new Request(`http://localhost:3000/api/admin/ai-tutor/messages${query}`) as never);
}

const ROW = {
  id: 1,
  createdAt: new Date('2026-10-21T07:57:00.000Z'),
  role: 'user',
  status: 'ok',
  content: 'จะใช้ some ตอนไหน',
  archived: false,
  questionId: 2098,
  questionText: 'ข้อความโจทย์',
  cefrLevel: 'A2',
  grammarTopic: 'some',
  userId: 'u1',
  userEmail: 'learner@example.com',
  userName: 'ผู้เรียน',
  model: null,
  latencyMs: null,
  inputTokens: null,
  outputTokens: null,
  selectedAnswer: 'A',
  isCorrect: true,
  attemptKey: 'attempt-aaaa-0001',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.listAiTutorMessages.mockResolvedValue({
    rows: [ROW],
    total: 1,
    summary: { questions: 1, answers: 0, failed: 0, learners: 1, topQuestions: [] },
  });
});

describe('GET /api/admin/ai-tutor/messages', () => {
  it('ไม่ใช่แอดมิน → ส่งต่อ error จาก withAdmin (401/403)', async () => {
    const denied = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    mocks.withAdmin.mockResolvedValue({ error: denied, session: null });

    const res = await get();
    expect(res.status).toBe(403);
    expect(mocks.listAiTutorMessages).not.toHaveBeenCalled();
  });

  it('ค่าเริ่มต้ม = 30 วัน · เฉพาะคำถามผู้เรียน · ทุกสถานะ', async () => {
    const res = await get();
    expect(res.status).toBe(200);

    const filters = mocks.listAiTutorMessages.mock.calls[0][0];
    expect(filters.days).toBe(30);
    expect(filters.role).toBe('user');
    expect(filters.status).toBe('all');
    expect(filters.page).toBe(1);
    expect(filters.includeArchived).toBe(true);
  });

  it('อ่านตัวกรองจาก query string', async () => {
    await get('?days=7&role=assistant&status=failed&questionId=2098&q=some&page=3&includeArchived=0');

    const filters = mocks.listAiTutorMessages.mock.calls[0][0];
    expect(filters.days).toBe(7);
    expect(filters.role).toBe('assistant');
    expect(filters.status).toBe('failed');
    expect(filters.questionId).toBe(2098);
    expect(filters.search).toBe('some');
    expect(filters.page).toBe(3);
    expect(filters.includeArchived).toBe(false);
  });

  it('ค่าผิด → ใช้ค่าเริ่มต้ม ไม่ error', async () => {
    await get('?days=abc&role=xxx&status=yyy&questionId=-5&page=0');

    const filters = mocks.listAiTutorMessages.mock.calls[0][0];
    expect(filters.days).toBe(30);
    expect(filters.role).toBe('user');
    expect(filters.status).toBe('all');
    expect(filters.questionId).toBeNull();
    expect(filters.page).toBe(1);
  });

  it('คืนรายการ + สรุป + meta สำหรับหน้า admin', async () => {
    const res = await get();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.rows).toHaveLength(1);
    expect(body.data.rows[0]).toMatchObject({
      id: 1,
      role: 'user',
      content: 'จะใช้ some ตอนไหน',
      questionId: 2098,
      userEmail: 'learner@example.com',
    });
    expect(body.data.rows[0].createdAt).toBe('2026-10-21T07:57:00.000Z');
    expect(body.data.summary).toMatchObject({ questions: 1, learners: 1 });
    expect(body.meta).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });

  it('ตารางยังไม่มี (migration ยังไม่รัน) → 503 พร้อมข้อความชัดเจน', async () => {
    mocks.listAiTutorMessages.mockRejectedValue(new Error('relation "ai_tutor_messages" does not exist'));

    const res = await get();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('ยังไม่ได้รัน migration ของ AI Tutor');
    // ไม่เผยรายละเอียด error ภายใน
    expect(JSON.stringify(body)).not.toContain('ai_tutor_messages');
  });
});
