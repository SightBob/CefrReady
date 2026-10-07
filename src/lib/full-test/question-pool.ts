import { unstable_cache, revalidateTag } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';

/**
 * Pool metadata used by the adaptive selector.
 *
 * Every `/full/next`, `/full/resume` and `/full/start` call used to re-read the
 * same rows for the same part — 45 identical queries per exam — even though the
 * pool only changes when an admin edits questions. This cache removes one DB
 * round trip per question and keeps the payload small (id/type/level only).
 *
 * `tapExercise IS NULL` keeps Tap & Select items out of the mock exam: those
 * belong to test sets ("mixed" sets embed tap items on questions of any type,
 * e.g. a focus-form row carrying tapExercise), and the full exam has no tap
 * renderer — without the filter such a row is served as a broken MCQ.
 *
 * `revalidate: 30` is the safety net: even if an admin route forgets to call
 * revalidateQuestionPool(), a change is visible within 30 seconds.
 */
export const QUESTION_POOL_CACHE_TAG = 'full-test-question-pool';

export const getCachedQuestionPool = unstable_cache(
  async (part: string) =>
    db
      .select({ id: questions.id, testTypeId: questions.testTypeId, cefrLevel: questions.cefrLevel })
      .from(questions)
      .where(and(eq(questions.testTypeId, part), eq(questions.active, 'true'), isNull(questions.tapExercise))),
  ['full-test-question-pool'],
  { revalidate: 30, tags: [QUESTION_POOL_CACHE_TAG] },
);

/**
 * Call after any admin write that can change which questions are in a pool
 * (create/update/delete/import, or a change to `active` / `cefrLevel`).
 * Cheaper and instant compared to waiting out the 30s revalidate window.
 */
export function revalidateQuestionPool(): void {
  try {
    revalidateTag(QUESTION_POOL_CACHE_TAG, { expire: 0 });
  } catch (err) {
    // Outside a request scope (scripts, tests) there is nothing to revalidate —
    // the 30s TTL still keeps the pool fresh.
    console.warn('[question-pool] revalidate skipped:', err);
  }
}
