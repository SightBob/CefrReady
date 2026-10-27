'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import SectionCard, { type SectionData } from '@/components/SectionCard';

const ANNOUNCEMENT =
  'เนื่องจาก CEFR Ready กำลังพัฒนาข้อสอบให้แม่นยำขึ้น เราจึงขอเริ่มเก็บค่าบริการตั้งแต่วันที่ 1 พฤศจิกายน 2569 เป็นต้นไป เพื่อนๆสามารถใช้งานได้ “ ฟรี ” จนกว่าจะถึงกำหนดสิ้นสุด';

interface TestsPageClientProps {
  sections: SectionData[];
  user: { name: string | null; email: string | null } | null;
  /** พาร์ทที่ admin ปิดปรับปรุงอยู่ (id → true) — การ์ดพาไปหน้าแจ้งแทนหน้าสอบ */
  maintenanceSections?: Record<string, boolean>;
}

export default function TestsPageClient({ sections, user, maintenanceSections = {} }: TestsPageClientProps) {
  const router = useRouter();
  const isAuthenticated = Boolean(user);
  const [showBanner, setShowBanner] = useState(true);
  const fullMaintenance = Boolean(maintenanceSections['full']);

  const handleOpenSection = (section: SectionData) => {
    // พาร์ทปิดปรับปรุง → หน้าแจ้งเฉพาะพาร์ท (ไม่ต้องล็อกอินก่อน)
    if (maintenanceSections[section.id]) {
      router.push(`/tests/${section.id}/maintenance`);
      return;
    }
    if (!isAuthenticated) {
      void signIn(undefined, { callbackUrl: '/tests' });
      return;
    }
    router.push(`/tests/${section.id}`);
  };

  const handleHeroCta = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      void signIn(undefined, { callbackUrl: '/tests' });
    }
  };

  return (
    <div className="min-h-svh pb-8">
      {/* Announcement banner — Figma desktop 60:957, mobile 200:9343 (390×37,
          #8EBEE6, 12px medium, 10px padding, nowrap) — slides as a marquee. */}
      {showBanner && (
        <div className="relative flex h-[37px] w-full items-center bg-[#8EBEE6] lg:h-[51px]">
  <div className="w-full overflow-hidden px-[10px] lg:px-14">
    {/* Mobile: marquee */}
    <div className="marquee-track lg:hidden">
      <span className="whitespace-nowrap text-[12px] font-medium leading-normal text-white">
        {ANNOUNCEMENT}
      </span>

      <span
        aria-hidden="true"
        className="whitespace-nowrap text-[12px] font-medium leading-normal text-white"
      >
        {ANNOUNCEMENT}
      </span>
    </div>

    {/* Desktop: single announcement centered */}
    <div className="hidden w-full items-center justify-center lg:flex">
      <span className="whitespace-nowrap text-[14px] font-semibold leading-normal text-white">
        {ANNOUNCEMENT}
      </span>
    </div>
  </div>

  <button
    type="button"
    onClick={() => setShowBanner(false)}
    aria-label="ปิดประกาศ"
    className="absolute right-0 top-1/2 flex h-[29.57px] w-[29.57px] -translate-y-1/2 items-center justify-center bg-[#8EBEE6]"
  >
    <svg
      width="29.57"
      height="29.57"
      viewBox="0 0 29.5654 29.5654"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15.9759 14.7827L19.3158 11.4429C19.4743 11.2846 19.5634 11.0699 19.5636 10.846C19.5638 10.622 19.475 10.4071 19.3168 10.2486C19.1586 10.0901 18.9439 10.0009 18.7199 10.0007C18.4959 10.0005 18.2811 10.0893 18.1226 10.2476L14.7827 13.5874L11.4429 10.2476C11.2844 10.089 11.0694 10 10.8452 10C10.621 10 10.4061 10.089 10.2476 10.2476C10.089 10.4061 10 10.621 10 10.8452C10 11.0694 10.089 11.2844 10.2476 11.4429L13.5874 14.7827L10.2476 18.1226C10.089 18.2811 10 18.496 10 18.7202C10 18.9444 10.089 19.1594 10.2476 19.3179C10.4061 19.4764 10.621 19.5654 10.8452 19.5654C11.0694 19.5654 11.2844 19.4764 11.4429 19.3179L14.7827 15.978L18.1226 19.3179C18.2811 19.4764 18.496 19.5654 18.9444 19.3179L15.9759 14.7827Z"
        fill="white"
      />
    </svg>
  </button>
</div>
      )}

      {/* 200:9227 — the 390px frame centres a 339px content column, i.e. ~26px
          side margins on mobile; wider breakpoints keep their own padding. */}
      <div className="mx-auto w-full max-w-[1040px] px-[26px] sm:px-6 lg:max-w-[1152px] lg:px-0 xl:px-0">
        {/* Hero — Figma 580:1655-580:1664 at 1536px: badge top 169 (h 32),
            title top 222, subtitle top 266, squiggle top 341.
            Mobile keeps 200:9228 (339×158) untouched. */}
        <section className="relative px-0 pt-[14px] lg:px-[28px] lg:pt-[30px]">
          {/* 580:1659 — 394×32 pill replaces the CTA while the full mock is closed */}
          {fullMaintenance && (
            <span className="inline-flex items-center whitespace-normal rounded-[18px] bg-[#E7EEF4] px-[27px] py-[9px] text-[13px] font-medium leading-[21px] text-[#334155] lg:h-[32px] lg:whitespace-nowrap lg:py-0">
              สอบจำลองเต็มรูปแบบ ปิดปรับปรุงชั่วคราว แล้วพบกันใหม่เร็วๆนี้
            </span>
          )}

          {/* 580:1657 — 24px bold #334155 / 580:1658 — 17px semibold #56606F */}
          <h1 className={`text-[16px] font-bold leading-[26px] text-[#334155] lg:text-[24px] lg:leading-[40px] ${fullMaintenance ? 'mt-[18px] lg:mt-[21px]' : ''}`}>
            จำลองการสอบจริง “ ครอบคลุมเนื้อหาทั้งหมด ”
          </h1>
          <p className="mt-[4px] text-[13px] font-medium leading-[21px] text-[#6f7c8e] lg:text-[17px] lg:font-semibold lg:leading-[28px] lg:text-[#56606F]">
            ระดับความยากง่ายที่มีตั้งแต่ A1 - B2 กับโจทย์ที่จำลอง
            <br className="lg:hidden" />
            มาให้อย่างครบถ้วน
          </p>

          {!fullMaintenance && (
            <Link
              href="/tests/full"
              onClick={handleHeroCta}
              className="mt-[18px] flex h-[38px] w-[182px] items-center justify-center rounded-[10px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-[14px] font-semibold text-[#574E29] lg:mt-[30px] lg:h-[51px] lg:w-[298px] lg:rounded-[14px] lg:border-b-[5px] lg:border-r-[4px] lg:text-[16px] lg:font-bold"
            >
              <span className="lg:hidden">เริ่มสอบเลย</span>
              <span className="hidden lg:inline">ฝึกทำข้อสอบ</span>
            </Link>
          )}

          {/* Otter with exam sign — mobile 200:9237 (90×93 at the content's
              right edge, 65px below the h1). The maintenance badge pushes the
              h1 down by 78px, so the otter follows it or it would land on the
              title. */}
          <div className={`absolute right-0 ${fullMaintenance ? 'top-[157px]' : 'top-[79px]'} h-[93px] w-[90px] lg:hidden`} aria-hidden="true">
            <div className="absolute left-[15.12px] top-[66.13px] h-[26.866px] w-[57.348px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
            <div className="absolute left-0 top-0 h-[76.449px] w-[89.985px] overflow-hidden">
              <Image src="/tests/otter-exam-sign.png" alt="" width={90} height={90} unoptimized className="absolute left-0 top-0 max-w-none" />
            </div>
          </div>

          {/* Otter with Exam sign — 580:1661: group 167.2×192 sits 6px below the
              banner; image cropped to 167.2×142.05 (top 85% of the square),
              board 106.56×59.52 at (28.1, 132.45) — 21.5px in from the content edge */}
          <div className="absolute right-0 top-[41px] hidden h-[190px] w-[174px] lg:top-[6px] lg:right-[calc(28px+21.5px)] lg:block lg:h-[192px] lg:w-[167.2px]" aria-hidden="true">
            <div className="absolute left-[29px] top-[128px] h-[62px] w-[111px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0] lg:left-[28.1px] lg:top-[132.45px] lg:h-[59.52px] lg:w-[106.56px]" />
            <div className="absolute left-0 top-0 h-[148px] w-[174px] overflow-hidden lg:h-[142.05px] lg:w-[167.2px]">
              <Image src="/logo-otter/otter-exam.png" alt="" width={167} height={167} className="absolute left-0 top-0 h-auto w-full max-w-none lg:h-[167.2px] lg:w-[167.2px]" />
            </div>
          </div>
        </section>

        {/* Squiggle divider — Figma 580:1664: top 341 (subtitle block ends 294 → 47px),
              spans the full content column */}
        <div
          aria-hidden="true"
          className="mt-[26px] h-[9px] max-w-[985px] bg-[url('/tests/squiggle-line.svg')] bg-no-repeat lg:mx-[28px] lg:mt-[47px] lg:max-w-none lg:bg-[url('/bg/squiggle-line.svg')]"
          style={{ backgroundSize: '100% 100%' }}
        />

        {/* 580:1665 — blue panel 1152×301 (#E6F0F8, radius 29) holds the
            heading row (top 404) and the card grid (top 455) on desktop only;
            mobile keeps its own spacing from 200:9241/200:9242. */}
        <div className="lg:mt-[21px] lg:rounded-[29px] lg:bg-[#E6F0F8] lg:px-[28px] lg:pt-[33px] lg:pb-[40px]">
          <div className="flex items-center">
            <h2 className="mt-[11px] text-[16px] font-semibold leading-[26px] text-[#334155] lg:mt-0 lg:text-[20px] lg:leading-[33px] lg:text-[#484534]">
              ฝึกทำข้อสอบตามหมวดหมู่
            </h2>

            {/* 580:1734 — 151×30 pill, 14px left of the heading */}
            <span className="ml-[14px] hidden h-[30px] w-[151px] items-center justify-center gap-[8px] rounded-[37px] bg-[#FFFAE6] lg:inline-flex">
              <span className="relative flex h-[14px] w-[14px] items-center justify-center">
                <span className="absolute h-[14px] w-[14px] rounded-full bg-[#FDF6DA]" />
                <span className="relative h-[8px] w-[8px] rounded-full bg-[#FFDB40]" />
              </span>
              <span className="text-[13px] font-semibold leading-[18px] text-[#6D5B16]">พร้อมใช้งาน</span>
            </span>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg font-medium">No test sections available yet.</p>
              <p className="text-sm mt-1">Please check back later.</p>
            </div>
          ) : (
            /* 580:1739 — four 259×177 cards, 20px apart */
            <div className="mt-[4px] grid grid-cols-1 gap-[14px] py-2 sm:grid-cols-2 lg:mt-[18px] lg:grid-cols-4 lg:gap-[20px] lg:py-0">
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onOpen={handleOpenSection}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}