import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { questions, testAttempts } from '@/db/schema';
import { withSelection } from '@/lib/full-test/state';
import { getInitialLevels } from '@/lib/full-test/algorithm';
import { FULL_TEST_PART_DISTRIBUTION } from '@/lib/full-test/constants';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), pool: vi.fn(), auth: vi.fn(), update: vi.fn(), insert: vi.fn() }));
vi.mock('@/db', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null, checkIpThrottle: async () => null, checkUserRateLimit: async () => null }));
vi.mock('@/lib/full-test/question-pool', () => ({ getCachedQuestionPool: mocks.pool }));
vi.mock('@/lib/full-test/log-selection', () => ({ determineSelectionMode: () => 'reuse' }));
import { POST } from './route';

const question = { id: 1, testTypeId: 'focus-form', cefrLevel: 'B1', difficulty: 'medium', correctAnswer: 'A', article: null };
let attempt: Record<string, unknown>;
let tx: Record<string, unknown>;
const request = (body: Record<string, unknown> = {}) => new NextRequest('http://localhost:3000/api/tests/full/next', {
  method: 'POST', body: JSON.stringify({ attemptId: 5, questionId: 1, questionIndex: 0, selectedAnswer: 'A', timeRemaining: 3500, ...body }),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.pool.mockResolvedValue([question]);
  attempt = { id: 5, status: 'in_progress', adaptivePath: [], currentLevels: withSelection(getInitialLevels('B1'), { questionId: 1, slot: 0, reused: false }), startedAt: new Date(), lastActivityAt: new Date(), timeRemainingSeconds: 3600 };
  tx = {
    select: () => {
      let table: unknown;
      const chain = { from: (value: unknown) => { table = value; return chain; }, where: () => chain,
        limit: () => chain, for: () => Promise.resolve([attempt]),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(table === testAttempts ? [attempt] : table === questions ? [question] : []).then(resolve),
      };
      return chain;
    },
    update: () => ({ set: mocks.update.mockImplementation((value) => ({ where: async () => { attempt = { ...attempt, ...value }; } })) }),
    insert: () => ({ values: mocks.insert.mockResolvedValue(undefined) }),
  };
  mocks.transaction.mockImplementation(async (callback) => callback(tx));
});

describe('adaptive next slot integrity', () => {
  it('completes all 45 slots with reuse across every part', async () => {
    const bank = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'].map((part, index) => ({
      ...question, id: index + 1, testTypeId: part,
      article: part === 'form-meaning' ? { blanks: [{ id: 1, correctAnswer: 'is' }] } : null,
    }));
    mocks.pool.mockImplementation(async (part) => bank.filter((row) => row.testTypeId === part));
    tx.select = () => {
      let table: unknown;
      let id = 0;
      const chain = { from: (value: unknown) => { table = value; return chain; },
        where: (query: SQL) => { id = Number(new PgDialect().sqlToQuery(query).params[0]); return chain; }, limit: () => chain,
        for: async () => [attempt],
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(table === testAttempts ? [attempt] : bank.filter((row) => row.id === id)).then(resolve),
      };
      return chain;
    };
    for (let index = 0; index < FULL_TEST_PART_DISTRIBUTION.length; index++) {
      const row = bank.find((item) => item.testTypeId === FULL_TEST_PART_DISTRIBUTION[index])!;
      const response = await POST(request({ questionId: row.id, questionIndex: index, selectedAnswer: row.article ? '{"1":"is"}' : 'A' }));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.finished).toBe(index === 44);
      expect(attempt.adaptivePath).toHaveLength(index + 1);
    }
    expect((attempt.adaptivePath as Array<{ reused: boolean }>).filter((entry) => entry.reused).length).toBe(41);
  });
  it('rejects an arbitrary question and never writes', async () => {
    expect((await POST(request({ questionId: 999 }))).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('advances a reused question at a new slot', async () => {
    attempt.adaptivePath = [{ ...question, questionId: 1, selectedAnswer: 'A', wasCorrect: true, orderIndex: 0 }];
    attempt.currentLevels = withSelection(getInitialLevels('B1'), { questionId: 1, slot: 1, reused: true });
    const response = await POST(request({ questionIndex: 1 }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.questionIndex).toBe(2);
    expect(attempt.adaptivePath).toHaveLength(2);
    expect((attempt.adaptivePath as Array<{ reused: boolean }>)[1].reused).toBe(true);
  });
  it('retries an earlier slot without grading it twice', async () => {
    await POST(request());
    mocks.update.mockClear();
    const response = await POST(request());
    expect((await response.json()).data.questionIndex).toBe(1);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(attempt.adaptivePath).toHaveLength(1);
  });
  it('rejects invalid JSON and future slots', async () => {
    expect((await POST(new NextRequest('http://localhost/api/tests/full/next', { method: 'POST', body: '{' }))).status).toBe(400);
    expect((await POST(request({ questionIndex: 4 }))).status).toBe(409);
  });
  it('rejects expired attempts', async () => {
    attempt.startedAt = new Date(Date.now() - 4_000_000);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('fails without saving the current answer when the next pool is empty', async () => {
    mocks.pool.mockResolvedValue([]);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await POST(request())).status).toBe(500);
      expect(mocks.update).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
