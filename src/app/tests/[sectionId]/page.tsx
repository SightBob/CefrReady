import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { fetchSectionsFromDb } from '@/lib/sections';
import type { SectionData } from '@/components/SectionCard';
import SectionTestSetCard from '@/components/SectionTestSetCard';

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
    console.error('[tests/[sectionId]] Failed to fetch sections:', err);
  }
  return [];
}

async function getSection(sectionId: string) {
  const sections = await getSections();
  return sections.find((section) => section.id === sectionId) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}): Promise<Metadata> {
  const { sectionId } = await params;
  const section = await getSection(sectionId);
  if (!section) return { title: 'CEFR Ready' };
  return {
    title: `${section.name} | CEFR Ready`,
    description:
      section.description ?? `ข้อสอบหมวด ${section.name} ครอบคลุมเนื้อหาทั้งหมดของ CEFR Ready`,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const section = await getSection(sectionId);

  // Preserve the previous stub behaviour: unknown sections go back to /tests.
  if (!section) redirect('/tests');

  const activeSets = section.testSets.filter((testSet) => testSet.isActive);

  return (
    <div className="relative min-h-svh bg-white pb-8">
      {/* Otter illustration — Figma 60:178 (image 60:180 + sign 60:179) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[calc(50%+434.81px)] top-[22px] hidden h-[146px] w-[141.27px] -translate-x-1/2 lg:block"
      >
        <div className="absolute left-0 top-0 h-[120.018px] w-[141.271px] overflow-hidden">
          <Image
            src="/logo-otter/otter-exam.png"
            alt=""
            width={141}
            height={141}
            className="absolute left-0 top-0 h-[141.27px] w-full max-w-none"
          />
        </div>
        <div className="absolute left-[23.74px] top-[103.82px] h-[42.178px] w-[90.033px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
      </div>

      <div className="mx-auto w-full max-w-[1044px] px-4 sm:px-6 xl:px-0">
        {/* Back button — Figma 60:181 */}
        <div className="pt-[16px]">
          <Link
            href="/tests"
            aria-label="กลับไปหน้าข้อสอบ"
            className="flex h-[26px] w-[38px] items-center justify-center rounded-[8px] bg-[#F3F3F3] transition-colors hover:bg-[#E9E9E9]"
          >
            <Image src="/icons/arrow-back.svg" alt="" width={18} height={18} aria-hidden="true" />
          </Link>
        </div>

        {/* Title + badges — Figma 60:176 / 60:184 / 60:186 */}
        <div className="mt-[14px] flex items-center">
          <h1 className="shrink text-[26px] font-bold leading-[43px] text-[#334155]">
            {section.name}
          </h1>
          <span className="ms-3 flex h-[24px] w-[132px] shrink-0 items-center justify-center whitespace-nowrap rounded-[30px] bg-[#FFF0AE] px-[17px] text-center text-[12px] font-semibold text-[#6C5F2D]">
            มีเนื้อหาออกสอบบ่อย
          </span>
          <span className="ms-1.5 ml-[3px] flex h-[24px] w-[97px] shrink-0 items-center justify-center whitespace-nowrap rounded-[30px] bg-[#FFF0AE] px-[17px] text-center text-[12px] font-semibold text-[#6C5F2D]">
            โหมดทบทวน
          </span>
        </div>

        {/* Description — Figma 60:177 */}
        <p className="mt-[7px] max-w-[752px] text-[13px] font-medium leading-[21px] text-[#6F7C8E]">
          {section.description ?? ''}
        </p>

        {/* Squiggle divider — Figma 60:175 */}
        <div
          aria-hidden="true"
          className="ml-[4px] mt-[20px] h-[9px] w-[985px] max-w-full bg-[url('/bg/squiggle-line.svg')] bg-no-repeat"
          style={{ backgroundSize: '100% 100%' }}
        />

        {/* Test sets — Figma 60:188 grid: 3 x 320 with 25px / 23px gaps */}
        {activeSets.length === 0 ? (
          <div className="mt-[14px] py-16 text-center text-slate-500">
            <p className="text-lg font-medium">No test sets available yet.</p>
            <p className="mt-1 text-sm">Please check back later.</p>
          </div>
        ) : (
          <div className="mt-[14px] grid max-w-[1010px] grid-cols-1 gap-x-[20px] gap-y-[23px] sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-[25px]">
            {activeSets.map((testSet) => (
              <SectionTestSetCard
                key={testSet.id}
                testSet={testSet}
                sectionId={section.id}
                duration={section.duration}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}