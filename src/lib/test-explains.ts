import { and, asc, eq, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import type { LessonSection } from '@/lib/lesson-sections';

export interface SectionExplain {
  id: number;
  grammarTopic: string;
  title: string;
  intro: string | null;
  sections: LessonSection[];
  tip: string | null;
}

/**
 * เนื้อหา Explain ที่แอดมินผูกไว้กับชุดข้อสอบนี้ (`test_set_ids`) — เฉพาะฉบับที่เผยแพร่แล้ว
 * ใช้ตรรกะเดียวกับ pinned lookup ของ /api/test-explains/lookup (ปกติ fallback
 * ตาม grammarTopic ซึ่งต้องมีบริบทคำถาม แต่หน้าเว็บไม่มี) — ถ้าไม่ผูกไว้คืน null
 */
export async function fetchExplainForSet(setId: number): Promise<SectionExplain | null> {
  const [row] = await db
    .select({
      id: testExplains.id,
      grammarTopic: testExplains.grammarTopic,
      title: testExplains.title,
      intro: testExplains.intro,
      sections: testExplains.sections,
      tip: testExplains.tip,
    })
    .from(testExplains)
    .where(
      and(
        eq(testExplains.isPublished, true),
        sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`,
      ),
    )
    .orderBy(asc(testExplains.id))
    .limit(1);

  if (!row) return null;
  return { ...row, sections: (row.sections ?? []) as LessonSection[] };
}

/** แคชชั้นข้อมูลแบบเดียวกับหน้า /tests — revalidate 300 วินาที (คีย์รวม setId อัตโนมัติ) */
export const getCachedExplainForSet = unstable_cache(
  async (setId: number): Promise<SectionExplain | null> => fetchExplainForSet(setId),
  ['explain-for-test-set'],
  { revalidate: 300, tags: ['test-explains'] },
);