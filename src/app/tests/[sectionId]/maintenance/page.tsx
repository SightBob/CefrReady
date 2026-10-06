import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSection, SECTION_BADGES } from '@/lib/test-section-display';

export const metadata: Metadata = {
  title: 'ปิดปรับปรุงชั่วคราว | CEFR Ready',
  description: 'พาร์ทข้อสอบนี้อยู่ระหว่างปิดปรับปรุงชั่วคราว ขออภัยในความไม่สะดวก',
  robots: { index: false, follow: false },
};

/**
 * หน้า "ปิดปรับปรุง" เฉพาะพาร์ทข้อสอบ — ธีมเดียวกับหน้า tests
 * (การ์ดขาวมุมโค้ง เงา offset #DEEBF6, ป้ายเหลือง #FFF0AE, ตัวอักษร #334155/#53657F,
 * น็อตตัวน้อยพร้อมป้ายเหลืองเหมือนหน้า /tests)
 */
export default async function SectionMaintenancePage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const section = await getSection(sectionId);
  const name = section?.name ?? 'พาร์ทนี้';

  return (
    <div className="flex min-h-svh items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {/* น็อตตัวน้อย + ป้ายเหลือง — ชุดรูปเดียวกับหน้า /tests (otter-exam) */}
        <div className="relative mx-auto mb-6 h-[93px] w-[90px]" aria-hidden="true">
          <div className="absolute left-[15.12px] top-[66.13px] h-[26.866px] w-[57.348px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
          <div className="absolute left-0 top-0 h-[76.449px] w-[89.985px] overflow-hidden">
            <Image src="/tests/otter-exam-sign.png" alt="" width={90} height={90} unoptimized className="absolute left-0 top-0 max-w-none" />
          </div>
        </div>

        <h1 className="text-[20px] font-bold leading-[33px] text-[#334155] sm:text-[26px] sm:leading-[43px]">
          {name} ปิดปรับปรุงชั่วคราว
        </h1>

        {SECTION_BADGES.includes(sectionId) && (
          <div className="mt-3 flex justify-center">
            <span className="flex h-[24px] items-center justify-center whitespace-nowrap rounded-[30px] bg-[#FFF0AE] px-[17px] text-center text-[11px] font-semibold text-[#6C5F2D]">
              กำลังอัปเกรดคุณภาพข้อสอบ
            </span>
          </div>
        )}

        <p className="mt-[15px] text-[13px] font-medium leading-[21px] text-[#6F7C8E]">
          เรากำลังปรับปรุงพาร์ทนี้ให้แม่นยำและใช้งานได้ดีขึ้น
          <br />
          ขออภัยในความไม่สะดวก แล้วพบกันใหม่เร็วๆ นี้
        </p>

        {/* เส้นคั่น squiggle — asset เดียวกับหน้า tests */}
        <div
          aria-hidden="true"
          className="mx-auto mt-[23px] h-[9px] w-full max-w-[339px] bg-[url('/tests/squiggle-line.svg')] bg-no-repeat"
          style={{ backgroundSize: '100% 100%' }}
        />

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/tests"
            className="flex h-[38px] w-[182px] items-center justify-center rounded-[10px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-[14px] font-semibold text-[#574E29]"
          >
            กลับหน้าข้อสอบ
          </Link>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#F3F3F3] px-4 py-2 text-[12px] font-medium text-[#6F7C8E]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8EBEE6] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#8EBEE6]" />
          </span>
          พาร์ทอื่นๆ ยังเข้าได้ตามปกติ
        </div>
      </div>
    </div>
  );
}
