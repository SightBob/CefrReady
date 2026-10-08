import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  ip: vi.fn(),
  userLimit: vi.fn(),
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  execute: vi.fn(),
  settings: vi.fn(),
}));

vi.mock('@/lib/api-security', () => ({ checkIpThrottle: mocks.ip, checkUserRateLimit: mocks.userLimit }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: mocks.currentUser }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  getRateLimitIdentifier: vi.fn(() => 'ip:127.0.0.1'),
}));
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mocks.select(...args),
    insert: (...args: unknown[]) => mocks.insert(...args),
    execute: (...args: unknown[]) => mocks.execute(...args),
  },
}));
vi.mock('@/lib/tap-reason-settings', () => ({ getTapReasonRewardSettingsSafe: mocks.settings }));

import { POST } from './route';

/** ข้อสอบ Tap & Select: item 0 เฉลยคือ choiceB */
const dbQuestion = {
  id: 1,
  testTypeId: 'focus-form',
  correctAnswer: null,
  explanation: null,
  tapExercise: {
    title: 'Tap & Select',
    items: [{ prompt: 'She ___ daily.', choiceA: 'go', choiceB: 'goes', correct: 1 as const }],
  },
};

const request = (body: Record<string, unknown> = {}) =>
  new NextRequest('http://localhost/api/tests/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testTypeId: 'focus-form',
      answers: [{ questionId: 1, selectedAnswer: JSON.stringify({ 0: 'B' }) }],
      tapReasons: { 1: { 0: 'เพราะ She เป็นเอกพจน์' } },
      ...body,
    }),
  });

const questionsChain = () => {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => Promise.resolve([dbQuestion]));
  return chain;
};

const testTypeChain = () => {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve([{ id: 'focus-form' }]));
  return chain;
};

const insertChain = () => {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve([{ id: 55 }]));
  chain.onConflictDoNothing = vi.fn(() => Promise.resolve(undefined));
  return chain;
};

/** แถวที่ถูก insert ลง tap_reason_submissions (หาได้จากค่าที่มีฟิลด์ reason) */
function reasonRowsInserted(): Array<Record<string, unknown>> | null {
  for (const call of mocks.insert.mock.results) {
    const chain = call.value as { values: ReturnType<typeof vi.fn> };
    const value = chain.values.mock.calls[0]?.[0] as unknown;
    if (Array.isArray(value) && value.length > 0 && typeof (value[0] as Record<string, unknown>).reason === 'string') {
      return value as Array<Record<string, unknown>>;
    }
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ip.mockResolvedValue(null);
  mocks.userLimit.mockResolvedValue(null);
  mocks.currentUser.mockResolvedValue({ id: 'learner' });
  mocks.settings.mockResolvedValue({ autoAward: true, points: 50 });
  mocks.select.mockReset();
  mocks.select.mockReturnValueOnce(questionsChain()).mockReturnValueOnce(testTypeChain());
  mocks.insert.mockReset().mockImplementation(() => insertChain());
  mocks.execute.mockReset().mockResolvedValue(undefined);
});

describe('POST /api/tests/submit — Tap & Select reward points', () => {
  it('awards the flat score the moment the learner writes a reason', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);

    const rows = reasonRowsInserted();
    expect(rows).toHaveLength(1);
    expect(rows![0]).toMatchObject({
      attemptId: 55,
      userId: 'learner',
      questionId: 1,
      itemIndex: 0,
      reason: 'เพราะ She เป็นเอกพจน์',
      isCorrect: true,
      rewardPoints: 50,
    });
    expect(rows![0].scoredAt).toBeInstanceOf(Date);
  });

  it('scores every reason with the same flat score, however many were written', async () => {
    mocks.select.mockReset();
    mocks.select
      .mockReturnValueOnce(questionsChain())
      .mockReturnValueOnce(testTypeChain());
    mocks.settings.mockResolvedValue({ autoAward: true, points: 7 });

    const response = await POST(
      request({
        answers: [{ questionId: 1, selectedAnswer: JSON.stringify({ 0: 'A' }) }],
        tapReasons: { 1: { 0: 'เหตุผลของข้อนี้' } },
      })
    );
    expect(response.status).toBe(200);
    expect(reasonRowsInserted()![0]).toMatchObject({ rewardPoints: 7, isCorrect: false });
  });

  it('leaves reasons unscored when the settings cannot be read (submit still succeeds)', async () => {
    mocks.settings.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(reasonRowsInserted()![0]).toMatchObject({ rewardPoints: null, scoredAt: null });
  });

  it('leaves reasons for the admin when flat scoring is turned off', async () => {
    mocks.settings.mockResolvedValue({ autoAward: false, points: 50 });
    await POST(request());
    expect(reasonRowsInserted()![0]).toMatchObject({ rewardPoints: null, scoredAt: null });
  });

  it('stores nothing at all for an item the learner left blank', async () => {
    const response = await POST(request({ tapReasons: { 1: { 0: '   ' } } }));
    expect(response.status).toBe(200);
    expect(reasonRowsInserted()).toBeNull();
    expect(mocks.insert).toHaveBeenCalledTimes(2); // attempts + user answers เท่านั้น
  });

  it('never fails the submission when reading the reward settings throws', async () => {
    mocks.settings.mockRejectedValue(new Error('redis down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const response = await POST(request());
      expect(response.status).toBe(200);
      // เหตุผลต้องถูกเก็บไว้เสมอ แม้ให้คะแนนไม่ได้
      expect(reasonRowsInserted()![0]).toMatchObject({ rewardPoints: null, scoredAt: null });
    } finally {
      warn.mockRestore();
    }
  });
});
