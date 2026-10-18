import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), rate: vi.fn(), select: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: mocks.origin, checkUserRateLimit: mocks.rate }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
import { POST } from './route';

const row = {
  correctAnswer: 'B',
  explanation: 'Third-person singular',
  tapExercise: { title: 'Practice', items: [{ prompt: 'She ___ daily.', choiceA: 'go', choiceB: 'goes', correct: 1 }] },
  article: { title: 'A', text: 'x', blanks: [{ id: 4, correctAnswer: 'watches' }] },
  active: 'true',
};
const request = (patch: Record<string, unknown> = {}) => new NextRequest('http://localhost:3000/api/tests/check-answer', {
  method: 'POST',
  body: JSON.stringify({ testSetId: 1, questionId: 2, selectedAnswer: 'B', ...patch }),
});

function rows(data: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const key of ['from', 'innerJoin', 'where']) builder[key] = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(data);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.origin.mockReturnValue(null);
  mocks.rate.mockResolvedValue(null);
  mocks.select.mockReturnValue(rows([row]));
});

const limited = (retryAfter = '60') =>
  new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
    status: 429,
    headers: { 'Retry-After': retryAfter },
  });

describe('POST check-answer', () => {
  it('rejects a disallowed origin before any auth or database work', async () => {
    const error = new Response('no');
    mocks.origin.mockReturnValue(error);
    expect(await POST(request())).toBe(error);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('rejects a caller with no session', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.rate).not.toHaveBeenCalled();
  });

  it('จำกัด 20 ครั้งต่อนาทีและเพดาน 600 ครั้งต่อวันต่อผู้เรียน', async () => {
    await POST(request());
    const calls = mocks.rate.mock.calls.map(c => c[1]);
    expect(calls).toContainEqual({ keySuffix: 'check-answer', maxRequests: 20 });
    expect(calls).toContainEqual({
      keySuffix: 'check-answer:day',
      maxRequests: 600,
      windowMs: 86_400_000,
    });
    expect(mocks.rate).toHaveBeenCalledWith('learner', expect.anything());
  });

  it('เกินโควตานาทีได้ 429 พร้อม Retry-After และข้อความที่ผู้เรียนอ่านรู้เรื่อง', async () => {
    mocks.rate.mockImplementation(async (_id: string, opts: { keySuffix: string }) =>
      opts.keySuffix === 'check-answer' ? limited('42') : null
    );
    const res = await POST(request());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ตรวจคำตอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('เกินเพดานรายวันได้ 429 เหมือนกัน', async () => {
    mocks.rate.mockImplementation(async (_id: string, opts: { keySuffix: string }) =>
      opts.keySuffix === 'check-answer:day' ? limited('3600') : null
    );
    const res = await POST(request());
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it.each([{ selectedAnswer: '' }, { testSetId: 0 }, { correctKey: 'A' }])('rejects malformed or client-supplied grading input %#', async patch => {
    expect((await POST(request(patch))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('ปิด branch itemIndex ที่หน้าเว็บไม่เรียก (tap ใช้ /api/tests/tap-reason)', async () => {
    expect((await POST(request({ selectedAnswer: 'B', itemIndex: 0 }))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('grades a multiple choice answer case-insensitively and returns the stored key', async () => {
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(body).toEqual({ success: true, data: { isCorrect: true, correctKey: 'B', correctText: null, explanation: 'Third-person singular' } });
  });

  it('tells the learner the answer is wrong without leaking it beforehand', async () => {
    const body = await (await POST(request({ selectedAnswer: 'A' }))).json();
    expect(body.data).toMatchObject({ isCorrect: false, correctKey: 'B' });
  });

  it('grades a cloze blank and returns the expected word', async () => {
    const body = await (await POST(request({ selectedAnswer: 'Watches', blankId: 4 }))).json();
    expect(body.data).toMatchObject({ isCorrect: true, correctKey: null, correctText: 'watches' });
  });

  it('404s an unknown blank slot', async () => {
    const response = await POST(request({ blankId: 99 }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: 'ไม่พบช่องคำตอบ' });
  });

  it('404s a question that is not in the set, so ids cannot be probed', async () => {
    mocks.select.mockReturnValue(rows([]));
    expect((await POST(request())).status).toBe(404);
  });

  it('fails closed with a retryable message when the database throws', async () => {
    mocks.select.mockImplementation(() => { throw new Error('secret connection string'); });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });
});
