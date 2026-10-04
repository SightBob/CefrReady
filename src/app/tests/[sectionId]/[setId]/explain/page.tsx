import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { fetchSectionsFromDb } from '@/lib/sections';
import { getCachedExplainForSet } from '@/lib/test-explains';
import type { SectionData } from '@/components/SectionCard';
import TestSetExplainView from '@/components/TestSetExplainView';

export const revalidate = 300;

const getCachedSections = unstable_cache(
  async (): Promise<SectionData[]> => {
    return await fetchSectionsFromDb();
  },
  ['tests-section-page-sections'],
  { revalidate: 300, tags: ['sections'] }
);

async function getSections() {
  try {
    return await getCachedSections();
  } catch (err) {
    console.error('[tests/[sectionId]/[setId]/explain] Failed to fetch sections:', err);
  }
  return [];
}

type ExplainParams = Promise<{ sectionId: string; setId: string }>;

export async function generateMetadata({ params }: { params: ExplainParams }): Promise<Metadata> {
  const { sectionId, setId } = await params;
  const sections = await getSections();
  const section = sections.find((item) => item.id === sectionId);
  const testSet = section?.testSets.find((item) => String(item.id) === setId);
  if (!section || !testSet) return { title: 'CEFR Ready' };
  return {
    title: `${testSet.name} — เนื้อหาอธิบาย | CEFR Ready`,
    description: testSet.description ?? `เนื้อหาอธิบายก่อนทำข้อสอบ ${testSet.name}`,
  };
}

/**
 * หน้าเนื้อหาอธิบายของชุดข้อสอบ — เปิดหลังหน้า /intro
 * UI เหมือนกด “โหมดทบทวน” ในหน้าสอบทุกจุด (ใช้ LessonLayout + ReviewContent ชุดเดียวกัน)
 */
export default async function TestSetExplainPage({ params }: { params: ExplainParams }) {
  const { sectionId, setId } = await params;
  const sections = await getSections();
  const section = sections.find((item) => item.id === sectionId);
  if (!section) redirect('/tests');

  const testSet = section.testSets.find((item) => String(item.id) === setId);
  if (!testSet) redirect(`/tests/${section.id}`);

  const explain = await getCachedExplainForSet(testSet.id);
  if (!explain) redirect(`/tests/${section.id}/${testSet.id}/intro`);

  return (
    <TestSetExplainView
      title={explain.title}
      intro={explain.intro}
      tip={explain.tip}
      sections={explain.sections}
      sectionId={section.id}
      quizHref={`/tests/${section.id}/${testSet.id}`}
      backHref={`/tests/${section.id}/${testSet.id}/intro`}
    />
  );
}