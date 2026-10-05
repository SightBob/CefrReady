import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCachedSections } from '@/lib/sections';
import { getCachedExplainForSet } from '@/lib/test-explains';

export const revalidate = 300;

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
    <div className="intro-fluid flex h-[100vh] flex-col bg-[#F7F7F7]">
      {/* Detail card — mobile 200:7664 (355×494, r30, ขอบ 18px) → desktop 75:68796
          (1061×546); ทุกขนาดไหลระหว่างสองเฟรมด้วย .intro-fluid */}
      <div className="relative mx-auto mt-[var(--intro-card-mt)] h-[var(--intro-card-h)] w-[var(--intro-card-w)] max-w-full shrink-0 rounded-[30px] bg-white">
        {/* Close — mobile 200:7665 (35×30, ไอคอน 20px, เส้นขอบล่าง-ขวา) → desktop 75:68807 */}
        <Link
          href={`/tests/${section.id}`}
          aria-label="กลับไปหน้าข้อสอบของหมวดนี้"
          className="absolute right-[var(--intro-close-right)] top-[var(--intro-close-top)] flex h-[var(--intro-close-h)] w-[var(--intro-close-w)] items-center justify-center rounded-[8px] border-b-[length:var(--intro-close-border)] border-r-[length:var(--intro-close-border)] border-[#C0BFB7] bg-white shadow-[0_0_0.3px_rgba(0,0,0,0.25)] md:border-l md:border-t"
        >
          <Image src="/tests/close-card.svg" alt="" width={20} height={20} unoptimized className="h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:hidden" aria-hidden="true" />
          <Image src="/icons/close.svg" alt="" width={24} height={24} className="hidden h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:block" aria-hidden="true" />
        </Link>

        {/* Otter with Exam sign — mobile 200:7668/200:7669 → desktop 75:68797
            (มือถือครอปภาพที่ 117.71% ของความสูงกรอบตาม design) */}
        <div aria-hidden="true" className="absolute left-1/2 top-[var(--intro-otter-top)] w-[var(--intro-otter-w)] -translate-x-1/2">
          {/* Yellow sign — อยู่ด้านหลัง */}
          <div
            className="absolute left-[var(--intro-sign-left)] top-[var(--intro-sign-top)] z-0 h-[var(--intro-sign-h)] w-[var(--intro-sign-w)] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]"
          />

          {/* Otter — อยู่ด้านหน้า */}
          <div className="relative z-10 h-[var(--intro-otter-inner-h)] w-[var(--intro-otter-w)] overflow-hidden md:overflow-visible">
            <Image
              src="/logo-otter/otter-exam.png"
              alt=""
              width={174}
              height={174}
              className="absolute left-0 top-0 h-[var(--intro-otter-w)] w-[var(--intro-otter-w)] max-w-none md:h-auto"
            />
          </div>
        </div>

        {/* Title — mobile 200:7671 · description — 200:7672 · stats — 200:7673 */}
        <div className="flex flex-col items-center px-4 pt-[var(--intro-text-top)] md:px-6">
          <h1 className="max-w-full text-center text-[length:var(--intro-title-size)] font-bold leading-[var(--intro-title-lh)] text-[#334155]">
            {testSet.name}
          </h1>
          {testSet.description && (
            <p className="mt-[var(--intro-desc-gap)] w-full max-w-[var(--intro-desc-width)] text-center text-[length:var(--intro-desc-size)] font-semibold leading-[var(--intro-desc-lh)] text-[#334155]">
              {testSet.description}
            </p>
          )}
          <div className="mt-[var(--intro-stats-gap)] flex flex-col items-center gap-[11px] md:flex-row">
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                มีทั้งหมด {testSet.questionCount} ข้อ
              </p>
            </div>
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                จับเวลา {section.duration ?? 0} นาที
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — mobile 200:7727 (h94, pt16 pb32, ปุ่ม 326×44), desktop 75:68810 */}
     <div className="mt-auto flex w-full shrink-0 justify-center bg-white shadow-[0_0_3.3px_rgba(172,172,172,0.25)]">
  <div className="flex w-full max-w-[1061px] items-center justify-center px-4 py-4 md:justify-end md:pr-[var(--intro-bar-pr)] xl:px-0">
    <Link
      href={nextHref}
      className="
        flex h-[var(--intro-cta-h)] w-full max-w-[var(--intro-cta-w)]
        items-center justify-center
        rounded-[14px]
        border-b-[3px] border-r-[2px] border-[#FFDB40]
        bg-[#FFF0AE]
        text-center text-[length:var(--intro-cta-size)] font-semibold text-[#524924]

        xl:h-[49px]
        xl:w-[216px]
        xl:max-w-none
        xl:rounded-[14px]
        xl:border
        xl:border-b-4
        xl:border-r-[3px]
        xl:text-[16px]
      "
    >
      ต่อไป
    </Link>
  </div>
</div>
    </div>
  );
}