import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ select: vi.fn(), user: vi.fn() }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: mocks.user }));
import { GET } from './route';
const request = new NextRequest('http://localhost/api/tests/attempts/5');
const props = { params: Promise.resolve({ attemptId: '5' }) };
function rows(value: unknown[]) {
  const chain = { from: () => chain, where: () => chain, limit: async () => value, orderBy: async () => value,
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(value).then(resolve) };
  return chain;
}
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: 'learner' }); });
describe('Review historical data', () => {
  it('returns original order and original answer keys after the bank changes', async () => {
    const snapshot = [{ questionId: 9, question: { id: 9, correctAnswer: 'A', orderIndex: 0 }, userAnswer: 'A', isCorrect: true }];
    mocks.select.mockReturnValueOnce(rows([{ id: 5, status: 'completed', testTypeId: 'focus-form', currentLevels: { __review: JSON.stringify(snapshot) } }]))
      .mockReturnValueOnce(rows([{ name: 'Grammar' }]))
      .mockReturnValueOnce(rows([{ questionId: 9, selectedAnswer: 'A', isCorrect: true }]))
      .mockReturnValueOnce(rows([{ id: 9, correctAnswer: 'B', orderIndex: 99 }]));
    const response = await GET(request, props);
    expect(response.status).toBe(200);
    expect((await response.json()).data.reviewItems).toEqual(snapshot);
  });
  it('rejects other-user or incomplete attempts without reading answers', async () => {
    mocks.select.mockReturnValue(rows([]));
    expect((await GET(request, props)).status).toBe(404);
    expect(mocks.select).toHaveBeenCalledOnce();
  });
});
