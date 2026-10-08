import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidateTag: vi.fn(),
  update: vi.fn(),
  /** payload ที่ route ส่งให้ db.update().set() — ใช้ยืนยันว่าสถานะถูกบันทึกจริง */
  setPayload: null as unknown,
}));

// คง unstable_cache ตัวจริงไว้ เพราะ question-pool สร้างแคชตอน import
vi.mock('next/cache', async importOriginal => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: mocks.revalidateTag,
}));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({ db: { update: (...args: unknown[]) => mocks.update(...args) } }));

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

beforeEach(() => {
  mocks.setPayload = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null });
  mocks.update.mockReset().mockReturnValue(builder([{ id: 7 }]));
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
