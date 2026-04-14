import { db } from '@/db';
import { testTypes, testSets, testSetQuestions } from '@/db/schema';
import { eq, asc, count as drizzleCount } from 'drizzle-orm';

export async function fetchSectionsFromDb() {
  const sections = await db
    .select()
    .from(testTypes)
    .where(eq(testTypes.active, 'true'))
    .orderBy(asc(testTypes.id));

  const sets = await db
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
    .orderBy(asc(testSets.sectionId), asc(testSets.orderIndex));

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
