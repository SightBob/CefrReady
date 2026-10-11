import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ select: vi.fn(), user: vi.fn() }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: mocks.user }));
vi.mock('@/lib/api-security', () => ({ checkIpThrottle: async () => null, checkUserRateLimit: async () => null }));
import { GET } from './route';
import { calculateFullTestResult } from '@/lib/full-test/result';
import type { AttemptPathEntry } from '@/lib/full-test/state';
const path: AttemptPathEntry[] = [
  { questionId: 1, testTypeId: 'focus-form', cefrLevel: 'C2', difficulty: null, wasCorrect: true, selectedAnswer: 'A', orderIndex: 0, questionSnapshot: {} as NonNullable<AttemptPathEntry['questionSnapshot']> },
  { questionId: 2, testTypeId: 'focus-form', cefrLevel: 'A1', difficulty: null, wasCorrect: false, selectedAnswer: 'A', orderIndex: 1, questionSnapshot: {} as NonNullable<AttemptPathEntry['questionSnapshot']> },
];
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: 'learner' }); });
describe('historical full result contract', () => {
  it('matches submit calculations for weighted CEFR and confidence', async () => {
    const chain = { from: () => chain, where: async () => [{ id: 5, status: 'completed', score: '50', adaptivePath: path }] };
    mocks.select.mockReturnValue(chain);
    const response = await GET(new Request('http://localhost/api/tests/full/result/5'), { params: Promise.resolve({ attemptId: '5' }) });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject(calculateFullTestResult(path));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('rejects unknown or another-user attempts', async () => {
    const chain = { from: () => chain, where: async () => [] };
    mocks.select.mockReturnValue(chain);
    expect((await GET(new Request('http://localhost/api'), { params: Promise.resolve({ attemptId: '5' }) })).status).toBe(404);
  });
});
