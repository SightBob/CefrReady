import { db } from '@/db';
import { testTypes, testSets, testSetQuestions, questions } from '@/db/schema';
import { eq, and, asc, ne, sql, count as drizzleCount } from 'drizzle-orm';
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

  /**
   * Form & Meaning: หนึ่ง "ข้อ" ใน test_set_questions คือบทความหนึ่งบทความ
   * ที่มีช่องว่างหลายช่อง (article.blanks) แต่ผู้เรียนเห็นเป็นหลายคำถาม
   * → การ์ดต้องนับช่องว่าง ไม่ใช่นับแถว (เดิมขึ้น "1 ข้อ" ทั้งที่สอบจริง 8 ช่อง)
   */
  const blankRows = await db
    .select({
      testSetId: testSetQuestions.testSetId,
      blanks: sql<number>`coalesce(sum(jsonb_array_length(coalesce(${questions.article} -> 'blanks', '[]'::jsonb))), 0)::int`,
    })
    .from(testSetQuestions)
    .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
    .groupBy(testSetQuestions.testSetId);
  const blanksBySet = new Map(blankRows.map((row) => [row.testSetId, Number(row.blanks)]));

  const result = sections.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    color: s.color,
    duration: s.duration,
    testSets: sets
      .filter((ts) => ts.sectionId === s.id)
      .map((ts) => ({
        ...ts,
        questionCount:
          s.id === 'form-meaning' && (blanksBySet.get(ts.id) ?? 0) > 0
            ? blanksBySet.get(ts.id)!
            : ts.questionCount,
      })),
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
