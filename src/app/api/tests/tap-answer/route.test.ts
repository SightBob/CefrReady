import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rate: vi.fn(),
  select: vi.fn(),
  isAdmin: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rate }));
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.isAdmin }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import { POST } from './route';

const body = { testSetId: 1, questionId: 2, itemIndex: 0, selectedAnswer: 'B' };
const request = (patch: Record<string, unknown> = {}) =>
  new NextRequest('http://localhost:3000/api/tests/tap-answer', {
    method: 'POST',
    body: JSON.stringify({ ...body, ...patch }),
  });

function rows(data: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const key of ['from', 'innerJoin', 'where']) builder[key] = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(data);
  return builder;
}

const exercise = (status?: string) => ({
  title: 'Practice',
  ...(status ? { status } : {}),
  items: [{ prompt: 'She ___ daily.', choiceA: 'go', choiceB: 'goes', correct: 1 as const }],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.rate.mockResolvedValue(null);
  mocks.isAdmin.mockReset().mockResolvedValue(false);
  mocks.select.mockReturnValue(rows([{ tapExercise: exercise() }]));
});

describe('POST tap-answer', () => {
  it('requires authentication', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('rejects a malformed body before querying', async () => {
    expect((await POST(request({ selectedAnswer: 'C' }))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('reveals only whether the chosen item is correct', async () => {
    const body = await (await POST(request({ selectedAnswer: 'B' }))).json();
    expect(body).toEqual({ success: true, data: { isCorrect: true } });

    mocks.select.mockReturnValue(rows([{ tapExercise: exercise() }]));
    const wrong = await (await POST(request({ selectedAnswer: 'A' }))).json();
    expect(wrong.data.isCorrect).toBe(false);
  });

  it('hides an activity that is not published from learners, with the same 404 as a missing item', async () => {
    mocks.select.mockReturnValue(rows([{ tapExercise: exercise('review') }]));

    const response = await POST(request());

    expect(response.status).toBe(404);
    // ตอบเหมือน “ไม่พบข้อ” ทุกประการ — ผู้เรียนจึงเดาไม่ได้ว่ามีของรอตรวจอยู่
    mocks.select.mockReturnValue(rows([{ tapExercise: null }]));
    expect(await response.json()).toEqual(await (await POST(request())).json());
  });

  it('lets an admin answer an activity that is not published in the preview exam', async () => {
    mocks.select.mockReturnValue(rows([{ tapExercise: exercise('review') }]));
    mocks.isAdmin.mockResolvedValue(true);

    expect((await POST(request())).status).toBe(200);
  });

  it('still reports a missing item as 404', async () => {
    mocks.select.mockReturnValue(rows([{ tapExercise: null }]));
    expect((await POST(request())).status).toBe(404);
  });
});
