import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'สอบจำลองเต็มรูปแบบ ปิดปรับปรุงชั่วคราว | CEFR Ready',
  description: 'พาร์ท Full Test อยู่ระหว่างปิดปรับปรุงชั่วคราว ขออภัยในความไม่สะดวก',
  robots: { index: false, follow: false },
};

/** หน้าแจ้ง "Full Test ปิดปรับปรุง" — ธีมเดียวกับหน้า tests */
export default function FullTestMaintenancePage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-6 h-[93px] w-[90px]" aria-hidden="true">
          <div className="absolute left-[15.12px] top-[66.13px] h-[26.866px] w-[57.348px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
          <div className="absolute left-0 top-0 h-[76.449px] w-[89.985px] overflow-hidden">
            <Image src="/tests/otter-exam-sign.png" alt="" width={90} height={90} unoptimized className="absolute left-0 top-0 max-w-none" />
          </div>
        </div>

        <h1 className="text-[20px] font-bold leading-[33px] text-[#334155] sm:text-[26px] sm:leading-[43px]">
          สอบจำลองเต็มรูปแบบ ปิดปรับปรุงชั่วคราว
        </h1>

        <p className="mt-[15px] text-[13px] font-medium leading-[21px] text-[#6F7C8E]">
          เรากำลังปรับปรุงข้อสอบให้แม่นยำและใช้งานได้ดีขึ้น
          <br />
          ขออภัยในความไม่สะดวก แล้วพบกันใหม่เร็วๆ นี้
        </p>

        <div
          aria-hidden="true"
          className="mx-auto mt-[23px] h-[9px] w-full max-w-[339px] bg-[url('/tests/squiggle-line.svg')] bg-no-repeat"
          style={{ backgroundSize: '100% 100%' }}
        />

        <div className="mt-6 flex justify-center">
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
