import { db } from '@/db';
import { testTypes, testSets, testSetQuestions } from '@/db/schema';
import { eq, and, asc, ne, count as drizzleCount } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export async function fetchSectionsFromDb() {
  const [sections, sets] = await Promise.all([
    db
      .select()
      .from(testTypes)
      .where(and(eq(testTypes.active, 'true'), ne(testTypes.id, 'tap-select')))
      .orderBy(asc(testTypes.id)),
    db
      .select({
        id: testSets.id,
        sectionId: testSets.sectionId,
        name: testSets.name,
        description: testSets.description,
        orderIndex: testSets.orderIndex,
        isActive: testSets.isActive,
        questionCount: drizzleCount(testSetQuestions.id),
      })
      .from(testSets)
      .leftJoin(testSetQuestions, eq(testSetQuestions.testSetId, testSets.id))
      .where(eq(testSets.isActive, true))
      .groupBy(testSets.id)
      .orderBy(asc(testSets.sectionId), asc(testSets.orderIndex)),
  ]);

  const result = sections.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    color: s.color,
    duration: s.duration,
    testSets: sets.filter((ts) => ts.sectionId === s.id),
  }));

  return result;
}

// All catalogue pages share the same public data and the same freshness policy.
// Keep authentication outside this cache; no session or user-specific data is stored.
export const getCachedSections = unstable_cache(
  fetchSectionsFromDb,
  ['sections-with-sets'],
  { revalidate: 300, tags: ['sections'] }
);
