import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidateTag: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  checkUserRateLimit: vi.fn(),
  /** payload ที่ route ส่งให้ db.update().set() — ใช้ยืนยันว่าสถานะถูกบันทึกจริง */
  setPayload: null as unknown,
}));

// คง unstable_cache ตัวจริงไว้ เพราะ question-pool สร้างแคชตอน import
vi.mock('next/cache', async importOriginal => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: mocks.revalidateTag,
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mocks.update(...args),
    select: (...args: unknown[]) => mocks.select(...args),
  },
}));

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  b.set = vi.fn((payload: unknown) => {
    mocks.setPayload = payload;
    return b;
  });
  for (const method of ['where', 'returning']) b[method] = vi.fn(() => b);
  b.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}

vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.checkUserRateLimit }));
import { PUT } from './route';

const tapExercise = (status?: string) => ({
  title: 'Present Simple',
  hint: 'แตะคำที่ถูก',
  ...(status ? { status } : {}),
  items: [{ prompt: 'She ___ to school.', choiceA: 'go', choiceB: 'goes', correct: 1 }],
});

const request = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/questions/7', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const params = { params: Promise.resolve({ id: '7' }) };

function selectBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'limit']) b[method] = vi.fn(() => b);
  b.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}

/** แถวเดิมใน DB ก่อนถูกแก้ — ใช้เทียบว่ามีเนื้อหาที่กระทบการตรวจเปลี่ยนไหม */
const storedQuestion = {
  id: 7,
  testTypeId: 'focus-form',
  questionText: 'Present Simple',
  optionA: null,
  optionB: null,
  optionC: null,
  optionD: null,
  correctAnswer: 'B',
  explanation: null,
  conversation: null,
  article: null,
  tapExercise: tapExercise('review'),
  active: 'true',
  statsCutoffAt: null,
};

beforeEach(() => {
  mocks.setPayload = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null });
  mocks.update.mockReset().mockReturnValue(builder([{ id: 7 }]));
  mocks.select.mockReset().mockReturnValue(selectBuilder([storedQuestion]));
  mocks.checkUserRateLimit.mockReset().mockResolvedValue(null);
});

describe('keySuffix ของ route ที่มี [id] ต้องคงที่', () => {
  // ถ้า keySuffix ผสม id จริง ผู้ใช้คนเดียวจะยิงข้าม id ไม่ได้
  // และตัวจำกัดโควตาจะกลายเป็นไม่จำกัด
  it.each(['7', '999', '12345'])('เรียก id=%s แล้วใช้ key เดียวกันทุกครั้ง', async (id) => {
    mocks.requireAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });

    await PUT(request({}), { params: Promise.resolve({ id }) });

    expect(mocks.checkUserRateLimit).toHaveBeenCalledWith(
      'admin-1',
      { keySuffix: 'admin:questions:[id]', maxRequests: 60 },
    );
  });

  it('สอง id ต่างกันใช้ keySuffix เดียวกัน ไม่แยกตัวนับ', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });

    await PUT(request({}), { params: Promise.resolve({ id: '1' }) });
    await PUT(request({}), { params: Promise.resolve({ id: '2' }) });

    const keys = mocks.checkUserRateLimit.mock.calls.map((call) => (call[1] as { keySuffix: string }).keySuffix);
    expect(keys).toEqual(['admin:questions:[id]', 'admin:questions:[id]']);
    expect(new Set(keys).size).toBe(1);
    expect(keys.join()).not.toContain('1');
  });
});

describe('PUT /api/admin/questions/[id] — Tap & Select status', () => {
  it('saves the “รอตรวจสอบ” status the admin picked in the editor', async () => {
    const response = await PUT(
      request({ testTypeId: 'focus-form', questionText: 'Present Simple', correctAnswer: null, tapExercise: tapExercise('review') }),
      params,
    );

    expect(response.status).toBe(200);
    expect(mocks.setPayload).toMatchObject({ tapExercise: { status: 'review' } });
  });

  it('accepts a hand-made payload that keeps the legacy activity visible', async () => {
    await PUT(
      request({ testTypeId: 'focus-form', questionText: 'Present Simple', correctAnswer: null, tapExercise: tapExercise() }),
      params,
    );

    // ไม่ส่งสถานะมา = ไม่ใส่ฟิลด์นี้ → tap-visibility ถือว่า published (ของผู้เรียนไม่หาย)
    expect(mocks.setPayload).toMatchObject({ tapExercise: { title: 'Present Simple' } });
    expect((mocks.setPayload as { tapExercise: Record<string, unknown> }).tapExercise.status).toBeUndefined();
  });

  it('rejects an unknown status instead of silently publishing hidden content', async () => {
    const response = await PUT(
      request({ testTypeId: 'focus-form', questionText: 'Present Simple', correctAnswer: null, tapExercise: tapExercise('archived') }),
      params,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'สถานะของกิจกรรม Tap & Select ไม่ถูกต้อง' });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('still blocks non-admins before validating anything', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error });

    expect(await PUT(request({ tapExercise: tapExercise('review') }), params)).toBe(error);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('PUT /api/admin/questions/[id] — stats cutoff', () => {
  it('เลื่อน stats_cutoff_at เมื่อเฉลยเปลี่ยน', async () => {
    const response = await PUT(request({ testTypeId: 'focus-form', questionText: 'Present Simple', correctAnswer: 'A' }), params);

    expect(response.status).toBe(200);
    expect((mocks.setPayload as { statsCutoffAt?: unknown }).statsCutoffAt).toBeInstanceOf(Date);
  });

  it('ไม่แตะ stats_cutoff_at เมื่อกดบันทึกโดยเนื้อหาเดิม', async () => {
    await PUT(request({ testTypeId: 'focus-form', questionText: 'Present Simple', correctAnswer: 'B' }), params);

    expect('statsCutoffAt' in (mocks.setPayload as object)).toBe(false);
  });

  it('ไม่แตะ stats_cutoff_at เมื่อแก้เฉพาะ active', async () => {
    await PUT(request({ testTypeId: 'focus-form', questionText: 'Present Simple', correctAnswer: 'B', active: 'false' }), params);

    expect('statsCutoffAt' in (mocks.setPayload as object)).toBe(false);
    expect(mocks.setPayload).toMatchObject({ active: 'false' });
  });

  it('ตอบ 404 และไม่เขียนอะไรเมื่อไม่พบข้อ', async () => {
    mocks.select.mockReturnValue(selectBuilder([]));

    const response = await PUT(request({ testTypeId: 'focus-form', questionText: 'X', correctAnswer: 'A' }), params);

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
