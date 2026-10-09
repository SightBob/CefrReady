import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCachedSections } from '@/lib/sections';
import { getCachedExplainsForSet, getCachedSetTopicRuns } from '@/lib/test-explains';
import { usesSetLevelExplain } from '@/lib/test-set-topics';
import TestSetExplainView from '@/components/TestSetExplainView';

export const revalidate = 300;

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

  const quizHref = `/tests/${section.id}/${testSet.id}`;
  const [explains, topicRuns] = await Promise.all([
    getCachedExplainsForSet(testSet.id),
    getCachedSetTopicRuns(testSet.id),
  ]);

  // ไม่มีเนื้อหาผูกไว้เลย → เข้าสอบได้เลย (ทั้งจากปุ่มและการเปิด URL ตรง)
  // (ฉบับร่างถูกกรองทิ้งแล้วใน fetchExplainsForSet)
  if (!usesSetLevelExplain(explains.length, topicRuns.length)) redirect(quizHref);

  return (
    <TestSetExplainView
      title={testSet.name}
      entries={explains.map((explain) => ({
        title: explain.title,
        intro: explain.intro,
        tip: explain.tip,
        sections: explain.sections,
      }))}
      sectionId={section.id}
      setId={testSet.id}
      quizHref={quizHref}
      backHref={`/tests/${section.id}/${testSet.id}/intro`}
    />
  );
}