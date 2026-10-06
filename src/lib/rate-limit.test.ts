import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ eval: vi.fn() }));
vi.mock('@upstash/redis', () => ({ Redis: class { eval = mocks.eval; } }));
import { rateLimit, rateLimitResponse } from './rate-limit';
beforeEach(() => { mocks.eval.mockReset(); });
afterEach(() => vi.restoreAllMocks());
describe('atomic fixed-window rate limit', () => {
  it('uses one eval for increment, expiry and TTL, only with a rate-limit key', async () => {
    mocks.eval.mockResolvedValue([1, 60_000]);
    expect(await rateLimit('user:42')).toEqual({ limited: false, retryAfterMs: 0 });
    expect(mocks.eval).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("redis.call('INCR', KEYS[1])"), ['rl:user:42'], [60_000]);
    const script = mocks.eval.mock.calls[0][0]; expect(script).toContain("redis.call('PEXPIRE'"); expect(script).toContain('ttl < 0');
    expect(script).not.toContain('maintenance');
  });
  it('allows the boundary request and rejects the next with actual retry TTL', async () => {
    mocks.eval.mockResolvedValueOnce([10, 23_500]).mockResolvedValueOnce([11, 23_499]);
    expect((await rateLimit('u')).limited).toBe(false);
    expect(await rateLimit('u')).toEqual({ limited: true, retryAfterMs: 23_499 });
    expect(rateLimitResponse(23_499).headers.get('Retry-After')).toBe('24');
  });
  it('preserves rounding of custom windows to whole seconds', async () => {
    mocks.eval.mockResolvedValue([3, 1999]); await rateLimit('u', { maxRequests: 2, windowMs: 1001 });
    expect(mocks.eval.mock.calls[0][2]).toEqual([2000]);
  });
  it('preserves the existing logged fail-open policy on storage outage', async () => {
    mocks.eval.mockImplementation(async () => { throw new Error('Redis unavailable'); }); const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await rateLimit('u');
    expect(result).toEqual({ limited: false, retryAfterMs: 0 });
    expect(log.mock.calls.length).toBe(1);
  });
});
