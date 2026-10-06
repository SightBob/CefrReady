import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ cache: vi.fn((fn: unknown) => fn) }));
vi.mock('next/cache', () => ({ unstable_cache: mocks.cache }));
vi.mock('@/db', () => ({ db: {} }));
import { VERB_BANK_CACHE_TAG } from './verb-bank-data';
describe('public verb cache contract', () => {
  it('caches only the public query for thirty seconds with an admin-invalidated tag', () => {
    expect(VERB_BANK_CACHE_TAG).toBe('verb-banks');
    expect(mocks.cache).toHaveBeenCalledExactlyOnceWith(expect.any(Function), ['public-verb-bank'], { revalidate: 30, tags: ['verb-banks'] });
  });
});
