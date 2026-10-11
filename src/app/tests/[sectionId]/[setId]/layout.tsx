import type { Metadata } from 'next';
import { getCachedSections } from '@/lib/sections';

/**
 * หน้าสอบของชุดข้อสอบ ([setId]/page.tsx) เป็น client component จึงประกาศ metadata เองไม่ได้
 * layout นี้จึงเป็นตัวตั้งชื่อแท็บจากชื่อชุดข้อสอบจริง และคง noindex ไว้เพราะเป็นหน้าทำข้อสอบ
 * (หน้า /intro และ /explain ประกาศ title ของตัวเองทับอยู่แล้ว)
 */
async function getSections() {
  try {
    return await getCachedSections();
  } catch (err) {
    console.error('[tests/[sectionId]/[setId]/layout] Failed to fetch sections:', err);
  }
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sectionId: string; setId: string }>;
}): Promise<Metadata> {
  const { sectionId, setId } = await params;
  const section = (await getSections()).find((item) => item.id === sectionId);
  const testSet = section?.testSets.find((item) => String(item.id) === setId);

  return {
    title: testSet ? `${testSet.name} (กำลังสอบ)` : 'ทำข้อสอบ',
    robots: { index: false, follow: true },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
