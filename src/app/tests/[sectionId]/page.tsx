import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCachedSections } from '@/lib/sections';
import { isSectionInMaintenance } from '@/lib/test-section-maintenance';
import SectionTestSetCard from '@/components/SectionTestSetCard';

export const revalidate = 300;

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

  // Admin ปิดปรับปรุงพาร์ทนี้ → พาไปหน้าแจ้งเฉพาะพาร์ท (ธีมเว็บ)
  if (await isSectionInMaintenance(sectionId)) redirect(`/tests/${sectionId}/maintenance`);

  const activeSets = section.testSets.filter((testSet) => testSet.isActive);

  return (
    <div className="relative min-h-svh bg-white pb-8">
      {/* Otter illustration — เดสก์ท็อป: Figma 60:178 (image 60:180 + sign 60:179)
          มือถือ: Figma 200:7267 — ย่อทั้งกลุ่มด้วยสเกล 0.3904 (141.271 → 55.153)
          และย้ายมาชิดขวา 16px โดยยังคงระยะห่างจากหัวเรื่อง 110px */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute max-[629px]:top-[166px] max-[760px]:top-[112px] h-[57px] w-[55.15px] max-[1050px]:right-0 min-[1050px]:left-[calc(50%+434.81px)] min-[760px]:top-[22px] min-[760px]:h-[146px] min-[760px]:w-[141.27px] min-[1050px]:-translate-x-1/2 "
      >
        <div className="absolute left-0 top-0 h-[46.86px] w-[55.15px] overflow-hidden min-[760px]:h-[120.018px] min-[760px]:w-[141.271px]">
          <Image
            src="/logo-otter/otter-exam.png"
            alt=""
            width={141}
            height={141}
            className="absolute left-0 top-0 h-[55.15px] w-full max-w-none min-[760px]:h-[141.27px]"
          />
        </div>
        <div className="absolute left-[9.27px] top-[40.53px] h-[16.47px] w-[35.15px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0] min-[760px]:left-[23.74px] min-[760px]:top-[103.82px] min-[760px]:h-[42.178px] min-[760px]:w-[90.033px]" />
      </div>

      <div className="mx-auto w-full max-w-[1044px] px-[27px] sm:px-6 xl:px-0">
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

        {/* Title + badges — เดสก์ท็อป Figma 60:176 / 60:184 / 60:186 (ป้ายอยู่ข้างหัวเรื่อง)
            มือถือ Figma 200:7259 (20px, กล่องสูง 33px) + 200:7261 (ป้ายล่างหัวเรื่อง 8px, gap 12px) */}
        <div className="mt-[14px] flex flex-col items-start gap-[8px] sm:flex-row sm:items-center sm:gap-0">
          <h1 className="shrink text-[20px] font-bold leading-[33px] text-[#334155] sm:text-[26px] sm:leading-[43px]">
            {section.name}
          </h1>
          <div className="flex items-center gap-[12px] sm:gap-0">
            <span className="flex h-[24px] w-[132px] shrink-0 items-center justify-center whitespace-nowrap rounded-[30px] bg-[#FFF0AE] px-[17px] text-center text-[11px] font-semibold text-[#6C5F2D] sm:ms-3 sm:text-[12px]">
              มีเนื้อหาออกสอบบ่อย
            </span>
            <span className="flex h-[24px] w-[97px] shrink-0 items-center justify-center whitespace-nowrap rounded-[30px] bg-[#FFF0AE] px-[17px] text-center text-[11px] font-semibold text-[#6C5F2D] sm:ms-1.5 sm:ml-[3px] sm:text-[12px]">
              โหมดทบทวน
            </span>
          </div>
        </div>

        {/* Description — เดสก์ท็อป Figma 60:177 · มือถือ Figma 200:7260 (12px, บรรทัด 20px, 3 บรรทัด = 60px, เว้น 15px จากป้าย) */}
        <p className="mt-[15px] max-w-full text-[12px] font-medium leading-[20px] text-[#6F7C8E] sm:mt-[7px] sm:max-w-[752px] sm:text-[13px] sm:leading-[21px]">
          {section.description ?? ''}
        </p>

        {/* Squiggle divider — เดสก์ท็อป Figma 60:175 · มือถือ Figma 200:7266 (สูง 8.635px, เต็มความกว้าง, เว้น 23px) */}
        <div
          aria-hidden="true"
          className="mt-[23px] min-[482px]:mt-[44px] h-[8.64px] w-full bg-[url('/bg/squiggle-line.svg')] bg-no-repeat sm:ml-[4px] sm:mt-[20px] sm:h-[9px] sm:max-w-[985px]"
          style={{ backgroundSize: '100% 100%' }}
        />

        {/* Test sets — เดสก์ท็อป Figma 60:188 grid: 3 x 320 with 25px / 23px gaps
            มือถือ Figma 200:7270 — การ์ด 320px จัดกึ่งกลางในคอลัมน์ 336px (ดีไซน์ x=34 / ขวา 36) ช่องไฟ 14px เว้นจากเส้นคั่น 16px */}
        {activeSets.length === 0 ? (
          <div className="mt-[14px] py-16 text-center text-slate-500">
            <p className="text-lg font-medium">No test sets available yet.</p>
            <p className="mt-1 text-sm">Please check back later.</p>
          </div>
        ) : (
          <div className="mx-auto mt-[16px] grid max-w-full grid-cols-1 gap-y-[14px] sm:mx-0 sm:mt-[14px] sm:w-auto sm:max-w-[1010px] sm:grid-cols-2 sm:gap-x-[20px] sm:gap-y-[23px] lg:grid-cols-3 lg:gap-x-[25px]">
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