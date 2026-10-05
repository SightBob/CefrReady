import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({ cache: vi.fn((fn) => fn) }));
vi.mock('next/cache', () => ({ unstable_cache: mocks.cache }));
vi.mock('@/db', () => ({ db: {} }));
import { fetchSectionsFromDb, getCachedSections } from './sections';

describe('shared section catalogue cache', () => {
  it('wraps the existing public query once with its unchanged five-minute policy', () => {
    expect(mocks.cache).toHaveBeenCalledTimes(1);
    expect(mocks.cache).toHaveBeenCalledWith(fetchSectionsFromDb, ['sections-with-sets'], {
      revalidate: 300, tags: ['sections'],
    });
    expect(getCachedSections).toBe(fetchSectionsFromDb);
  });

  it.each([
    'src/app/tests/page.tsx',
    'src/app/tests/[sectionId]/page.tsx',
    'src/app/tests/[sectionId]/[setId]/intro/page.tsx',
    'src/app/tests/[sectionId]/[setId]/explain/page.tsx',
    'src/app/api/sections/route.ts',
  ])('%s uses the shared cache rather than creating an independent entry', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    expect(source).toContain("import { getCachedSections } from '@/lib/sections'");
    expect(source).not.toContain('unstable_cache(');
  });
});
