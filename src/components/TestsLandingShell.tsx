'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * โครงหน้า landing แบบเดียวกับหน้า /tests — ประกาศ + hero + เส้นคลื่น + หัวข้อหมวดหมู่
 *
 * แยกเป็นคอมโพเนนต์เพื่อให้ /demo หน้าตาเหมือน /tests จริง โดยไม่ต้องคัดลอก JSX
 * (ค่า ANNOUNCEMENT ตรงนี้ซ้ำกับ src/app/tests/TestsPageClient.tsx หนึ่งจุด —
 *  ถ้าภายหลังเปลี่ยนข้อความประกาศให้เปลี่ยนทั้งสองที่)
 */
const ANNOUNCEMENT = 'เนื่องจาก CEFR Ready กำลังพัฒนาข้อสอบให้แม่นยำขึ้น เราจึงขอเริ่มเก็บค่าบริการตั้งแต่วันที่ 1 พฤศจิกายน 2569 เป็นต้นไป เพื่อนๆสามารถใช้งานได้ “ ฟรี ” จนกว่าจะถึงกำหนดสิ้นสุด';

export interface LandingHero {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  cta: { href: string; labelMobile: string; labelDesktop: string };
}

interface TestsLandingShellProps {
  hero: LandingHero;
  sectionTitle: React.ReactNode;
  children: React.ReactNode;
  /** false = ซ่อนแถบประกาศ (หน้าที่ไม่ใช่หน้าเชิญชวนสมัครสมาชิก) */
  showBanner?: boolean;
}

export default function TestsLandingShell({ hero, sectionTitle, children, showBanner = true }: TestsLandingShellProps) {
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <div className="min-h-svh pb-8">
      {/* Announcement banner — Figma desktop 60:957, mobile 200:9343 (390×37,
          #8EBEE6, 12px medium, 10px padding, nowrap) — slides as a marquee. */}
      {showBanner && bannerVisible && (
        <div className="relative flex h-[37px] w-full items-center bg-[#8EBEE6] lg:h-[51px]">
          <div className="w-full overflow-hidden px-[10px] lg:px-14">
            {/* Two identical copies: the track slides -50%, i.e. exactly one
                copy width, so the wrap-around is invisible. With a single copy
                the text snapped ~440px backwards every cycle. The second copy
                is aria-hidden so screen readers still hear it once. */}
            <div className="marquee-track">
              <span className="whitespace-nowrap text-[12px] font-medium leading-normal text-white lg:text-[14px] lg:font-semibold">
                {ANNOUNCEMENT}
              </span>
              <span
                aria-hidden="true"
                className="whitespace-nowrap text-[12px] font-medium leading-normal text-white lg:text-[14px] lg:font-semibold"
              >
                {ANNOUNCEMENT}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            aria-label="ปิดประกาศ"
            className="absolute right-0 top-1/2 flex h-[29.57px] w-[29.57px] -translate-y-1/2 items-center justify-center bg-[#8EBEE6]"
          >
            <svg width="29.57" height="29.57" viewBox="0 0 29.5654 29.5654" fill="none" aria-hidden="true">
              <path
                d="M15.9759 14.7827L19.3158 11.4429C19.4743 11.2846 19.5634 11.0699 19.5636 10.846C19.5638 10.622 19.475 10.4071 19.3168 10.2486C19.1586 10.0901 18.9439 10.0009 18.7199 10.0007C18.4959 10.0005 18.2811 10.0893 18.1226 10.2476L14.7827 13.5874L11.4429 10.2476C11.2844 10.089 11.0694 10 10.8452 10C10.621 10 10.4061 10.089 10.2476 10.2476C10.089 10.4061 10 10.621 10 10.8452C10 11.0694 10.089 11.2844 10.2476 11.4429L13.5874 14.7827L10.2476 18.1226C10.089 18.2811 10 18.496 10 18.7202C10 18.9444 10.089 19.1594 10.2476 19.3179C10.4061 19.4764 10.621 19.5654 10.8452 19.5654C11.0694 19.5654 11.2844 19.4764 11.4429 19.3179L14.7827 15.978L18.1226 19.3179C18.2811 19.4764 18.496 19.5654 18.7202 19.5654C18.9444 19.5654 19.1594 19.4764 19.3179 19.3179C19.4764 19.1594 19.5654 18.9444 19.5654 18.7202C19.5654 18.496 19.4764 18.2811 19.3179 18.1226L15.9759 14.7827Z"
                fill="white"
              />
            </svg>
          </button>
        </div>
      )}

      {/* 200:9227 — the 390px frame centres a 339px content column, i.e. ~26px
          side margins on mobile; wider breakpoints keep their own padding. */}
      <div className="mx-auto w-full max-w-[1040px] px-[26px] sm:px-6 xl:px-0">
        {/* Hero — desktop 60:846/60:847/60:843, mobile 200:9228 (339×158) */}
        <section className="relative pt-[14px] lg:pt-[38px]">
          <h1 className="text-[16px] font-bold leading-[26px] text-[#334155] lg:text-[26px] lg:leading-[43px]">
            {hero.title}
          </h1>
          <p className="mt-[4px] text-[13px] font-medium leading-[21px] text-[#6f7c8e] lg:text-[16px] lg:leading-[26px] lg:text-[#56606F]">
            {hero.subtitle}
          </p>
          <Link
            href={hero.cta.href}
            className="mt-[18px] flex h-[38px] w-[182px] items-center justify-center rounded-[10px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-[14px] font-semibold text-[#574E29] lg:mt-[30px] lg:h-[51px] lg:w-[298px] lg:rounded-[14px] lg:border-b-[5px] lg:border-r-[4px] lg:text-[16px] lg:font-bold"
          >
            <span className="lg:hidden">{hero.cta.labelMobile}</span>
            <span className="hidden lg:inline">{hero.cta.labelDesktop}</span>
          </Link>

          {/* Otter with exam sign — mobile 200:9237 (90×93 at the content's
              right edge, 65px below the hero top) */}
          <div className="absolute right-0 top-[79px] h-[93px] w-[90px] lg:hidden" aria-hidden="true">
            <div className="absolute left-[15.12px] top-[66.13px] h-[26.866px] w-[57.348px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
            <div className="absolute left-0 top-0 h-[76.449px] w-[89.985px] overflow-hidden">
              <Image src="/tests/otter-exam-sign.png" alt="" width={90} height={90} unoptimized className="absolute left-0 top-0 max-w-none" />
            </div>
          </div>

          {/* Otter with Exam sign — desktop 60:848 */}
          <div className="absolute right-0 top-[41px] hidden h-[190px] w-[174px] lg:block" aria-hidden="true">
            <div className="absolute left-[29px] top-[128px] h-[62px] w-[111px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
            <div className="absolute left-0 top-0 h-[148px] w-[174px] overflow-hidden">
              <Image src="/logo-otter/otter-exam.png" alt="" width={174} height={174} className="absolute left-0 top-0 max-w-none" />
            </div>
          </div>
        </section>

        {/* Squiggle divider — desktop 60:845 (985px), mobile 200:9236 (339px) */}
        <div
          aria-hidden="true"
          className="mt-[26px] h-[9px] bg-[url('/tests/squiggle-line.svg')] bg-no-repeat lg:mt-[34px] max-w-[985px] lg:bg-[url('/bg/squiggle-line.svg')]"
          style={{ backgroundSize: '100% 100%' }}
        />

        {/* 200:9241 — 339×26 at 16px semibold on mobile */}
        <h2 className="mt-[11px] text-[16px] font-semibold leading-[26px] text-[#334155] lg:ml-[7px] lg:mt-[21px] lg:text-[18px] lg:leading-[30px]">
          {sectionTitle}
        </h2>

        {children}
      </div>
    </div>
  );
}
