import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'learner' } }) }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null, checkIpThrottle: async () => null, checkUserRateLimit: async () => null }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUser: async () => ({ id: 'learner' }) }));
vi.mock('@/lib/full-test/submit-attempt', () => ({ submitAttempt: vi.fn() }));
import { POST as check } from './route';
import { POST as submit } from '../submit/route';
import { POST as cancel } from '../cancel/route';
beforeEach(() => vi.clearAllMocks());
const request = (body: string) => new NextRequest('http://localhost/api/tests/full/check', { method: 'POST', body });
describe('full API invalid input', () => {
  it.each([check, submit, cancel])('returns 400 for malformed JSON without database queries', async (handler) => {
    expect((await handler(request('{'))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it('denies a key when no persisted selection or selection log exists', async () => {
    function chain(rows: unknown[]) {
      const value = { from: () => value, where: () => value, orderBy: () => value, limit: async () => rows };
      return value;
    }
    mocks.select.mockReturnValueOnce(chain([{ id: 5, status: 'in_progress', answeredCount: 0, currentLevels: {} }]))
      .mockReturnValueOnce(chain([{ id: 1, testTypeId: 'focus-form', correctAnswer: 'A' }]))
      .mockReturnValueOnce(chain([]));
    expect((await check(request(JSON.stringify({ attemptId: 5, questionId: 1 })))).status).toBe(403);
  });
});
