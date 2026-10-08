import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), isAdmin: vi.fn(), select: vi.fn(), pending: 0, peak: 0, set: null as unknown, questions: [] as unknown[], fail: false }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.isAdmin }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
import { GET } from './route';
const request = new NextRequest('http://localhost:3000/api/test-sets/1');
const previewRequest = new NextRequest('http://localhost:3000/api/test-sets/1?preview=1');
const params = { params: Promise.resolve({ id: '1' }) };
const tap = (status?: string) => ({
  title: `Tap ${status ?? 'legacy'}`,
  ...(status ? { status } : {}),
  items: [{ prompt: 'She ___', choiceA: 'go', choiceB: 'goes', correct: 1 as const }],
});
beforeEach(() => {
  mocks.pending = 0; mocks.peak = 0; mocks.fail = false;
  mocks.set = { id: 1, sectionId: 'focus-form', name: 'Practice', description: null, duration: 20, isActive: true };
  mocks.questions = [{ id: 2, orderIndex: 0, questionText: 'Tap', tapExercise: { title: 'Tap', items: [{ prompt: 'She ___', choiceA: 'go', choiceB: 'goes', correct: 1 }] } }];
  mocks.auth.mockReset().mockResolvedValue({ user: { id: 'learner' } });
  mocks.isAdmin.mockReset().mockResolvedValue(false);
  mocks.select.mockReset().mockImplementation(() => {
    let name = '';
    const b: Record<string, unknown> = {};
    for (const method of ['from', 'innerJoin', 'where', 'limit', 'orderBy']) b[method] = (table?: Record<symbol, unknown>) => {
      if (method === 'from') name = String(table?.[Symbol.for('drizzle:Name')]); return b;
    };
    b.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => {
      mocks.pending++; mocks.peak = Math.max(mocks.peak, mocks.pending);
      return new Promise((done, fail) => setTimeout(() => {
        mocks.pending--; if (mocks.fail) fail(new Error('DB down'));
        else done(name === 'test_sets' ? (mocks.set ? [mocks.set] : []) : mocks.questions);
      }, 5)).then(resolve, reject);
    };
    return b;
  });
});
describe('parallel test-set loading', () => {
  it('does not query before authentication', async () => {
    mocks.auth.mockResolvedValue(null); expect((await GET(request, params)).status).toBe(401); expect(mocks.select).not.toHaveBeenCalled();
  });
  it('executes both queries together and ships the Tap answer key for instant reveal', async () => {
    const response = await GET(request, params); const body = await response.json();
    expect(mocks.peak).toBe(2); expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: 1, name: 'Practice', duration: 20 });
    expect(body.data.questions[0].orderIndex).toBe(0);
    // PRODUCT DECISION: ต้องการให้เฉลยขึ้นทันทีที่ผู้เรียนเลือก (เลือก → เฉลย → พิมพ์เหตุผล)
    // จึงส่ง item.correct มาด้วย — ไม่ต้องมี request เพิ่มตอนเลือกคำตอบ
    expect(body.data.questions[0].tapExercise.items[0]).toEqual({ prompt: 'She ___', choiceA: 'go', choiceB: 'goes', correct: 1 });
  });
  it.each([null, { id: 1, isActive: false }])('never returns missing or inactive set data %#', async set => {
    mocks.set = set; const response = await GET(request, params); expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: 'Test set not found' });
  });
  it('drops Tap & Select activities that are not published, and keeps the rest', async () => {
    mocks.questions = [
      { id: 1, orderIndex: 0, questionText: 'MCQ' },
      { id: 2, orderIndex: 1, tapExercise: tap('published') },
      { id: 3, orderIndex: 2, tapExercise: tap('review') },
      { id: 4, orderIndex: 3, tapExercise: tap() },
      { id: 5, orderIndex: 4, tapExercise: tap('hidden') },
    ];
    const body = await (await GET(request, params)).json();
    expect(body.data.questions.map((question: { id: number }) => question.id)).toEqual([1, 2, 4]);
    // ผู้เรียนไม่ต้องรู้ว่ามีของรอตรวจอยู่ — ไม่มีการถามสิทธิ์แอดมินด้วยซ้ำ
    expect(mocks.isAdmin).not.toHaveBeenCalled();
  });

  it('refuses ?preview=1 for anyone who is not an admin, before touching the database', async () => {
    const response = await GET(previewRequest, params);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ success: false, error: 'โหมดพรีวิวใช้ได้เฉพาะบัญชีผู้ดูแล' });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('serves the pending activity to an admin in preview mode, so it can be checked on the real exam page', async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.questions = [
      { id: 1, orderIndex: 0, questionText: 'MCQ' },
      { id: 3, orderIndex: 1, tapExercise: tap('review') },
    ];
    const body = await (await GET(previewRequest, params)).json();
    expect(body.data.questions.map((question: { id: number }) => question.id)).toEqual([1, 3]);
    expect(body.data.questions[1].tapExercise.status).toBe('review');
  });

  it('preserves the error response if either concurrent query fails', async () => {
    mocks.fail = true; const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try { expect((await GET(request, params)).status).toBe(500); } finally { log.mockRestore(); }
  });
});
