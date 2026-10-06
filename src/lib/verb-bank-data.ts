import { unstable_cache } from 'next/cache';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { verbBanks } from '@/db/schema';

export const VERB_BANK_CACHE_TAG = 'verb-banks';
export const getCachedVerbEntries = unstable_cache(
  async () => db
    .select({ id: verbBanks.id, v1: verbBanks.v1, v2: verbBanks.v2, v3: verbBanks.v3 })
    .from(verbBanks)
    .orderBy(asc(verbBanks.id)),
  ['public-verb-bank'],
  { revalidate: 30, tags: [VERB_BANK_CACHE_TAG] },
);
