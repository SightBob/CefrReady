import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), insert: vi.fn(), execute: vi.fn(), update: vi.fn() }));
vi.mock('@/db', () => ({ db: { transaction: mocks.transaction } }));
import { submitAttempt } from './submit-attempt';
let attempt: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  attempt = { id: 5, status: 'in_progress', adaptivePath: [
    { questionId: 1, testTypeId: 'focus-form', cefrLevel: 'C2', wasCorrect: true, selectedAnswer: 'A', orderIndex: 0, questionSnapshot: {} },
    { questionId: 2, testTypeId: 'focus-form', cefrLevel: 'A1', wasCorrect: false, selectedAnswer: 'B', orderIndex: 1, questionSnapshot: {} },
  ] };
  mocks.insert.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValue(undefined);
  mocks.update.mockImplementation((value) => ({ where: async () => { attempt = { ...attempt, ...value }; } }));
  mocks.transaction.mockImplementation(async (callback) => {
    const original = structuredClone(attempt);
    const chain = { from: () => chain, where: () => chain, limit: () => chain, for: async () => [attempt] };
    try {
      return await callback({ select: () => chain, insert: () => ({ values: mocks.insert }), execute: mocks.execute, update: () => ({ set: mocks.update }) });
    } catch (error) { attempt = original; throw error; }
  });
});
describe('atomic full submit', () => {
  it('preserves CEFR, confidence and totals on a completed retry without new writes', async () => {
    const first = await submitAttempt(5, 'learner');
    expect(first).toMatchObject({ score: 50, cefrLevel: 'C2', normalizedScore: 113, confidence: 'low' });
    const retry = await submitAttempt(5, 'learner');
    expect(retry).toEqual(first);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });
  it.each(['answers', 'progress'])('does not complete when %s storage fails', async (stage) => {
    (stage === 'answers' ? mocks.insert : mocks.execute).mockRejectedValueOnce(new Error('outage'));
    await expect(submitAttempt(5, 'learner')).rejects.toThrow('outage');
    expect(attempt.status).toBe('in_progress');
    expect(mocks.update).not.toHaveBeenCalled();
    await expect(submitAttempt(5, 'learner')).resolves.toMatchObject({ score: 50 });
    expect(attempt.status).toBe('completed');
  });
});
