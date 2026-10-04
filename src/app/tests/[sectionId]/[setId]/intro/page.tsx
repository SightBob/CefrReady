import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { fetchSectionsFromDb } from '@/lib/sections';
import { getCachedExplainForSet } from '@/lib/test-explains';
import type { SectionData } from '@/components/SectionCard';

export const revalidate = 300;

const getCachedSections = unstable_cache(
  async (): Promise<SectionData[]> => {
    return await fetchSectionsFromDb();
  },
  ['tests-set-intro-sections'],
  { revalidate: 300, tags: ['sections'] }
);

async function getSections() {
  try {
    return await getCachedSections();
  } catch (err) {
    console.error('[tests/[sectionId]/[setId]/intro] Failed to fetch sections:', err);
  }
  return [];
}

async function getSection(sectionId: string) {
  const sections = await getSections();
  return sections.find((section) => section.id === sectionId) ?? null;
}

type IntroParams = Promise<{ sectionId: string; setId: string }>;

export async function generateMetadata({ params }: { params: IntroParams }): Promise<Metadata> {
  const { sectionId, setId } = await params;
  const section = await getSection(sectionId);
  const testSet = section?.testSets.find((item) => String(item.id) === setId);
  if (!section || !testSet) return { title: 'CEFR Ready' };
  return {
    title: `${testSet.name} | CEFR Ready`,
    description: testSet.description ?? `รายละเอียดชุดข้อสอบ ${testSet.name}`,
  };
}

/** Test-set detail page — Figma 75:68795 (Tutor - Testing), desktop 1536x700. */
export default async function TestSetIntroPage({ params }: { params: IntroParams }) {
  const { sectionId, setId } = await params;
  const section = await getSection(sectionId);
  if (!section) redirect('/tests');

  const testSet = section.testSets.find((item) => String(item.id) === setId);
  if (!testSet) redirect(`/tests/${section.id}`);

  // เนื้อหาอธิบายที่แอดมินผูกไว้กับชุดนี้ — ถ้ามี ปุ่ม “ต่อไป” จะพาไปหน้า /explain
  // ก่อน แล้วจึงเข้าสอบ; ถ้าไม่มีก็เข้าสอบได้เลยเหมือนเดิม
  const explain = await getCachedExplainForSet(testSet.id);
  const nextHref = explain
    ? `/tests/${section.id}/${testSet.id}/explain`
    : `/tests/${section.id}/${testSet.id}`;

  return (
    <div className="flex min-h-svh flex-col bg-[#F7F7F7]">
      {/* Detail card — Figma 75:68796 */}
      <div className="relative mx-auto mt-[23px] h-[546px] w-[1061px] max-w-full shrink-0 rounded-[30px] bg-white">
        {/* Close — Figma 75:68807 */}
        <Link
          href={`/tests/${section.id}`}
          aria-label="กลับไปหน้าข้อสอบของหมวดนี้"
          className="absolute right-[24px] top-[22px] flex h-[41px] w-[46px] items-center justify-center rounded-[8px] border border-[#C0BFB7] border-b-2 border-r-2 bg-white shadow-[0_0_0.3px_rgba(0,0,0,0.25)]"
        >
          <Image src="/icons/close.svg" alt="" width={24} height={24} aria-hidden="true" />
        </Link>

        {/* Otter with Exam sign — Figma 75:68797 */}
<div
  aria-hidden="true"
  className="absolute left-1/2 top-[43px] h-[190px] w-[174.169px] -translate-x-1/2"
>
  {/* Yellow sign — อยู่ด้านหลัง */}
  <div
    className="
      absolute
      left-[29.27px]
      top-[128px]
      z-0
      h-[62px]
      w-[111px]
      rounded-bl-[3px]
      rounded-br-[15px]
      border-r-[7px]
      border-[#FFDB40]
      bg-[#FFEDA0]
    "
  />

  {/* Otter — อยู่ด้านหน้า */}
  <div className="relative z-10 h-[147.967px] w-[174.169px] overflow-visible">
    <Image
      src="/logo-otter/otter-exam.png"
      alt=""
      width={174}
      height={174}
      className="absolute left-0 top-0 h-auto w-full max-w-none"
    />
  </div>
</div>

        {/* Title — 75:68800 · description — 75:68801 · stats — 75:68802 */}
        <div className="flex flex-col items-center pt-[255px]">
          <h1 className="max-w-[704px] text-center text-[26px] font-bold leading-[43px] text-[#334155]">
            {testSet.name}
          </h1>
          {testSet.description && (
            <p className="mt-[7px] max-w-[445px] text-center text-[18px] font-semibold leading-[30px] text-[#334155]">
              {testSet.description}
            </p>
          )}
          <div className="mt-[22px] flex items-center gap-[11px]">
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[16px] font-semibold leading-[24px] text-[#6C5F2D]">
                มีทั้งหมด {testSet.questionCount} ข้อ
              </p>
            </div>
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[16px] font-semibold leading-[24px] text-[#6C5F2D]">
                จับเวลา {section.duration ?? 0} นาที
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — Figma 75:68810 */}
      <div className="mt-auto flex h-[97px] w-full shrink-0 items-end justify-end bg-white pr-[241px] pb-8 pt-4 shadow-[0_0_3.3px_rgba(172,172,172,0.25)]">
        <Link
          href={nextHref}
          className="flex h-[49px] w-[216px] items-center justify-center rounded-[14px] border border-[#FFDB40] border-b-4 border-r-[3px] bg-[#FFF0AE] text-center text-[16px] font-semibold text-[#524924]"
        >
          ต่อไป
        </Link>
      </div>
    </div>
  );
}