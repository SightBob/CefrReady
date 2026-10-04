'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import SectionCard, { type SectionData } from '@/components/SectionCard';
import FullTestCard from '@/components/FullTestCard';

// FeedbackDiscoveryModal intentionally not rendered — feature disabled until
// the feedback survey launches.

interface TestsPageClientProps {
  sections: SectionData[];
  user: { name: string | null; email: string | null } | null;
}

export default function TestsPageClient({ sections, user }: TestsPageClientProps) {
  const router = useRouter();
  const isAuthenticated = Boolean(user);
  const [showBanner, setShowBanner] = useState(true);

  const handleOpenSection = (section: SectionData) => {
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
      {/* Announcement banner — Figma 60:957 */}
      {showBanner && (
        <div className="relative flex min-h-[51px] w-full items-center justify-center bg-[#8EBEE6] px-14 py-1.5 lg:h-[51px] lg:py-0">
          <p className="text-center text-[14px] font-semibold leading-normal text-white">
            เนื่องจาก CEFR Ready กำลังพัฒนาข้อสอบให้แม่นยำขึ้น เราจึงขอเริ่มเก็บค่าบริการตั้งแต่วันที่ 1 พฤษจิกายน 2569 เป็นต้นไป เพื่อนๆสามารถใช้งานได้ “ ฟรี ” จนกว่าจะถึงกำหนดสิ้นสุด
          </p>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="ปิดประกาศ"
            className="absolute right-[26px] top-1/2 flex h-[29.57px] w-[29.57px] -translate-y-1/2 items-center justify-center"
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

      <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-6 xl:px-0">
        {/* Hero — Figma 60:846/60:847/60:843 + otter 60:848 */}
        <section className="relative">
          <h1 className="pt-[38px] text-[26px] font-bold leading-[43px] text-[#334155]">
            รวมข้อสอบเสมือนจริง “ ครอบคลุมเนื้อหาทั้งหมด ”
          </h1>
          <p className="mt-[4px] text-[16px] font-medium leading-[26px] text-[#56606F]">
            ระดับความยากง่ายที่มีตั้งแต่ A1 - B2 กับโจทย์ที่จำลองมาให้อย่าครบถ้วน
          </p>
          <Link
            href="/tests/full"
            onClick={handleHeroCta}
            className="mt-[30px] flex h-[51px] w-[298px] items-center justify-center rounded-[14px] border-b-[5px] border-r-[4px] border-[#FFDB40] bg-[#FFF0AE] text-[16px] font-bold text-[#574E29]"
          >
            ฝึกทำข้อสอบ
          </Link>

          {/* Otter with Exam sign */}
          <div className="absolute right-0 top-[41px] hidden h-[190px] w-[174px] lg:block" aria-hidden="true">
            <div className="absolute left-[29px] top-[128px] h-[62px] w-[111px] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
            <div className="absolute left-0 top-0 h-[148px] w-[174px] overflow-hidden">
              <Image src="/logo-otter/otter-exam.png" alt="" width={174} height={174} className="absolute left-0 top-0 max-w-none" />
            </div>
          </div>
        </section>

        {/* Squiggle divider — Figma 60:845 */}
        <div
          aria-hidden="true"
          className="mt-[34px] h-[9px] w-[985px] max-w-full bg-[url('/bg/squiggle-line.svg')] bg-no-repeat"
          style={{ backgroundSize: '100% 100%' }}
        />

        <h2 className="ml-[7px] mt-[21px] text-[18px] font-semibold leading-[30px] text-[#334155]">ฝึกทำข้อสอบตามหมวดหมู่</h2>

        {sections.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium">No test sections available yet.</p>
            <p className="text-sm mt-1">Please check back later.</p>
          </div>
        ) : (
          <div className="mt-[14px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                onOpen={handleOpenSection}
              />
            ))}
          </div>
        )}

        <FullTestCard disabled={!isAuthenticated} />
      </div>
    </div>
  );
}
