import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), rate: vi.fn(), select: vi.fn(), enabled: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: mocks.origin, checkUserRateLimit: mocks.rate }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/ai-tutor', () => ({ isAiTutorEnabled: mocks.enabled }));
import { POST } from './route';
import { verifyAnswerProof } from '@/lib/ai-tutor/proof';
import { users } from '@/db/schema';

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
  mocks.enabled.mockResolvedValue(false);
  process.env.AI_TUTOR_PROOF_SECRET = 'check-answer-test-secret';
  delete process.env.AI_TUTOR_ENABLED;
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

  it('จำกัด 60 ครั้งต่อนาทีและเพดาน 600 ครั้งต่อวันต่อผู้เรียน', async () => {
    await POST(request());
    const calls = mocks.rate.mock.calls.map(c => c[1]);
    // 60/นาที ต้องไม่ต่ำกว่าจำนวนข้อในชุดใหญ่สุด (25) — เดิม 20 ทำให้ชนเพดานกลางชุด
    expect(calls).toContainEqual({ keySuffix: 'check-answer', maxRequests: 60 });
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

describe('check-answer — proof สำหรับ AI Tutor', () => {
  it('ผู้เรียนทั่วไปได้ response เดิมทุกประการ (ไม่มี answerProof)', async () => {
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(body).toEqual({ success: true, data: { isCorrect: true, correctKey: 'B', correctText: null, explanation: 'Third-person singular' } });
    expect(body.data.answerProof).toBeUndefined();
  });

  it('เปิด master switch (AI_TUTOR_ENABLED) แล้วผู้เรียนที่ล็อกอินได้ answerProof ที่ตรวจผ่าน (ผูก user+ข้อ+คำตอบ)', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(typeof body.data.answerProof).toBe('string');
    expect(() => verifyAnswerProof({ proof: body.data.answerProof, userId: 'learner', questionId: 2 })).not.toThrow();
    // proof ของข้ออื่นใช้ไม่ได้
    expect(() => verifyAnswerProof({ proof: body.data.answerProof, userId: 'learner', questionId: 3 })).toThrow();
    // proof ของผู้เรียนอื่นใช้ไม่ได้
    expect(() => verifyAnswerProof({ proof: body.data.answerProof, userId: 'other', questionId: 2 })).toThrow();
  });

  it('ไม่ได้ตั้ง AI_TUTOR_PROOF_SECRET → ไม่ออก proof (fail-closed) แต่ response ยังเหมือนเดิม', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    delete process.env.AI_TUTOR_PROOF_SECRET;
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(body.data.answerProof).toBeUndefined();
    expect(body.data.correctKey).toBe('B');
  });

  it('ไม่ได้ตั้ง secret → บอกฝั่ง client ว่าระบบยังไม่พร้อม (aiTutorReady=false) ไม่ใช่โทษผู้เรียน', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    delete process.env.AI_TUTOR_PROOF_SECRET;
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(body.data.aiTutorReady).toBe(false);
    expect(body.data.answerProof).toBeUndefined();
    // เฉลยยังถูกต้องตามปกติ (ตรวจคำตอบยังทำงาน)
    expect(body.data.correctKey).toBe('B');
  });

  it('ตั้ง secret แล้ว → aiTutorReady=true พร้อม proof', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(body.data.aiTutorReady).toBe(true);
    expect(typeof body.data.answerProof).toBe('string');
  });

  it('ฟีเจอร์ปิดทั้งระบบ → ไม่มีฟิลด์ aiTutorReady เพิ่ม (response เดิมทุก field)', async () => {
    delete process.env.AI_TUTOR_ENABLED;
    const body = await (await POST(request({ selectedAnswer: 'b' }))).json();
    expect(body.data).toEqual({ isCorrect: true, correctKey: 'B', correctText: null, explanation: 'Third-person singular' });
    expect('aiTutorReady' in body.data).toBe(false);
  });

  it('เส้นทางนี้ไม่อ่านสิทธิ์ผู้ใช้จาก DB เลย (ไม่มี query ที่ดึง ai_tutor_access)', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    await POST(request({ selectedAnswer: 'b' }));
    // ไม่มีการเรียก isAiTutorEnabled (ซึ่งไปอ่าน users.ai_tutor_access)
    expect(mocks.enabled).not.toHaveBeenCalled();
    // และไม่มี select ไหนดึงคอลัมน์ ai_tutor_access
    for (const call of mocks.select.mock.calls) {
      const fields = call[0] as Record<string, unknown> | undefined;
      expect(Object.keys(fields ?? {})).not.toContain('aiTutorAccess');
    }
  });

  it('ฐานข้อมูลยังไม่มีคอลัมน์ ai_tutor_access (0045 ยังไม่รัน) → ยังตอบ 200 ตามปกติ', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    // จำลองว่าคิวรีที่แตะตาราง users จะพัง (คอลัมน์ยังไม่มี)
    mocks.select.mockImplementation(() => {
      const builder: Record<string, unknown> = {};
      for (const key of ['innerJoin', 'where']) builder[key] = vi.fn(() => builder);
      builder.from = vi.fn((table: unknown) => {
        if (table === users) throw new Error('column "ai_tutor_access" does not exist');
        return builder;
      });
      builder.limit = vi.fn().mockResolvedValue([row]);
      return builder;
    });

    const response = await POST(request({ selectedAnswer: 'b' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.correctKey).toBe('B');
  });
});
