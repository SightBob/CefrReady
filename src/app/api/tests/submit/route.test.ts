import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { userAnswers, testAttempts } from '@/db/schema';

const mocks = vi.hoisted(() => ({
  ip: vi.fn(),
  userLimit: vi.fn(),
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  execute: vi.fn(),
  settings: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/api-security', () => ({ checkIpThrottle: mocks.ip, checkUserRateLimit: mocks.userLimit }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: mocks.currentUser }));
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: vi.fn(async () => false) }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  getRateLimitIdentifier: vi.fn(() => 'ip:127.0.0.1'),
}));
vi.mock('@/db', () => ({
  db: {
    transaction: (...args: unknown[]) => mocks.transaction(...args),
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
      testSetId: 20,
      answers: [{ questionId: 1, selectedAnswer: JSON.stringify({ 0: 'B' }) }],
      tapReasons: { 1: { 0: 'เพราะ She เป็นเอกพจน์' } },
      ...body,
    }),
  });

const questionsChain = () => {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.orderBy = vi.fn(async () => [{ question: dbQuestion }]);
  chain.then = (resolve: (rows: unknown[]) => unknown) => Promise.resolve([dbQuestion]).then(resolve);
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
  mocks.select.mockReturnValueOnce(testTypeChain()).mockReturnValueOnce(questionsChain()).mockReturnValueOnce(testTypeChain());
  mocks.insert.mockReset().mockImplementation(() => insertChain());
  mocks.execute.mockReset().mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(async (callback) => callback({ insert: mocks.insert, execute: mocks.execute, select: mocks.select }));
});

describe('submission integrity', () => {
  it('does not let real submissions omit the authored set', async () => {
    expect((await POST(request({ testSetId: undefined }))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it('rejects duplicate and unknown question IDs', async () => {
    expect((await POST(request({ answers: [{ questionId: 1, selectedAnswer: '' }, { questionId: 1, selectedAnswer: '' }] }))).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect((await POST(request({ answers: [{ questionId: 999, selectedAnswer: '' }] }))).status).toBe(400);
  });
  it.each(['null', '{"0":3}', '[]'])('returns 400 for structured answer %s', async (answer) => {
    expect((await POST(request({ answers: [{ questionId: 1, selectedAnswer: answer }] }))).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('returns failure rather than success when the transaction cannot persist answers', async () => {
    mocks.transaction.mockRejectedValueOnce(new Error('answer storage down'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try { expect((await POST(request())).status).toBe(500); }
    finally { log.mockRestore(); }
  });
  it('rolls back when answer storage fails and succeeds on retry', async () => {
    let committed = false;
    mocks.transaction.mockImplementationOnce(async (callback) => {
      const tx = { select: mocks.select, execute: mocks.execute, insert: (...args: unknown[]) => {
        if (args[0] === userAnswers) return { values: async () => { throw new Error('answers unavailable'); } };
        return mocks.insert(...args);
      } };
      const result = await callback(tx);
      committed = true;
      return result;
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await POST(request())).status).toBe(500);
      expect(committed).toBe(false);
      mocks.select.mockReset().mockReturnValueOnce(testTypeChain()).mockReturnValueOnce(questionsChain()).mockReturnValueOnce(testTypeChain());
      expect((await POST(request())).status).toBe(200);
    } finally { log.mockRestore(); }
  });
  it('returns the same attempt for a retry without writing answers or progress again', async () => {
    const startedAt = '2026-01-01T00:00:00.000Z';
    let saved: Record<string, unknown> | undefined;
    const originalInsert = mocks.insert.getMockImplementation() as (table: unknown) => { values: ReturnType<typeof vi.fn> };
    mocks.insert.mockImplementation((table) => {
      const chain = originalInsert(table) as { values: ReturnType<typeof vi.fn> };
      const values = chain.values.getMockImplementation() as (value: unknown) => unknown;
      chain.values.mockImplementation((value) => { if (table === testAttempts) saved = value; return values(value); });
      return chain;
    });
    // No attempt matches this startedAt yet — the first submission must create one.
    const noAttemptYet = { from: () => noAttemptYet, where: () => noAttemptYet, limit: async () => [] };
    mocks.select.mockReturnValueOnce(noAttemptYet);
    expect((await POST(request({ startedAt }))).status).toBe(200);
    const writes = mocks.insert.mock.calls.length;
    const existing = { from: () => existing, where: () => existing, limit: async () => [{ ...saved, id: 55 }] };
    mocks.select.mockReset().mockReturnValueOnce(testTypeChain()).mockReturnValueOnce(questionsChain()).mockReturnValueOnce(testTypeChain()).mockReturnValueOnce(existing);
    const retry = await POST(request({ startedAt }));
    expect((await retry.json()).data.attemptId).toBe(55);
    expect(mocks.insert).toHaveBeenCalledTimes(writes);
  });
  it('uses every authored question as denominator when an answer is omitted', async () => {
    const chain: Record<string, unknown> = {};
    chain.from = chain.innerJoin = chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(async () => [
      { question: { id: 1, testTypeId: 'focus-form', correctAnswer: 'A', explanation: null } },
      { question: { id: 2, testTypeId: 'focus-form', correctAnswer: 'B', explanation: null } },
    ]);
    mocks.select.mockReset().mockReturnValueOnce(testTypeChain()).mockReturnValueOnce(chain).mockReturnValueOnce(testTypeChain()).mockReturnValueOnce(testTypeChain());
    const response = await POST(request({ testSetId: 20, answers: [{ questionId: 1, selectedAnswer: 'A' }], tapReasons: {} }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ score: 50, totalQuestions: 2, correctAnswers: 1 });
  });
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
      .mockReturnValueOnce(testTypeChain())
      .mockReturnValueOnce(questionsChain()).mockReturnValueOnce(testTypeChain());
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
