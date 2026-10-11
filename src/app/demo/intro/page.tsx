import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { countTestSetSlots, fetchMixedDemoQuestions } from '@/lib/demo-set';

const DEMO_INTRO_DESCRIPTION =
  'ลองทำข้อสอบตัวอย่างที่ปนกันทุกทักษะ Focus on Form, Meaning, Form & Meaning และ Listening ฟรี ไม่ต้องสมัครสมาชิก ไม่บันทึกผล';

export const metadata: Metadata = {
  title: 'โหมดตัวอย่าง — ทดลองทำข้อสอบปนทุกทักษะ',
  description: DEMO_INTRO_DESCRIPTION,
  alternates: { canonical: 'https://cefr-ready.site/demo/intro' },
  openGraph: {
    title: 'โหมดตัวอย่าง — ทดลองทำข้อสอบปนทุกทักษะ | CEFR Ready',
    description: DEMO_INTRO_DESCRIPTION,
    url: 'https://cefr-ready.site/demo/intro',
  },
};

/**
 * นับจำนวน slot จริงบนหน้า intro จากชุดเดียวกับที่ /demo/exam ได้ไป (fetchMixedDemoQuestions)
 * — สำคัญ: ถ้าดึงชุดเองจะนับไม่ตรงกับข้อสอบจริงเมื่อคลังข้อ demo เปลี่ยน
 */
async function loadDemoQuestionCount(): Promise<number> {
  try {
    return countTestSetSlots(await fetchMixedDemoQuestions());
  } catch (error) {
    console.error('[demo/intro] Failed to count demo questions:', error);
    return 0;
  }
}

/**
 * หน้า intro ของโหมดตัวอย่าง — หน้าตาเดียวกับหน้า intro ของชุดข้อสอบจริง
 * (/tests/[sectionId]/[setId]/intro · Figma 75:68795) แต่เนื้อหาเป็นชุด demo
 * ที่ผสมทุกทักษะเข้าด้วยกัน และปุ่มเดียว "เริ่มทำข้อสอบ" → /demo/exam
 */
export default async function DemoIntroPage() {
  const questionCount = await loadDemoQuestionCount();

  return (
    <div className="intro-fluid flex min-h-svh flex-col bg-[#F7F7F7]">
      {/* Detail card — โครงเดียวกับหน้า intro ของชุดข้อสอบจริง */}
      <div className="relative mx-auto mt-[var(--intro-card-mt)] h-[var(--intro-card-h)] w-[var(--intro-card-w)] max-w-full shrink-0 rounded-[30px] bg-white">
        {/* Close — กลับหน้าแรก */}
        <Link
          href="/"
          aria-label="กลับหน้าแรก"
          className="absolute right-[var(--intro-close-right)] top-[var(--intro-close-top)] flex h-[var(--intro-close-h)] w-[var(--intro-close-w)] items-center justify-center rounded-[8px] border-b-[length:var(--intro-close-border)] border-r-[length:var(--intro-close-border)] border-[#C0BFB7] bg-white shadow-[0_0_0.3px_rgba(0,0,0,0.25)] md:border-l md:border-t"
        >
          <Image src="/tests/close-card.svg" alt="" width={20} height={20} unoptimized className="h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:hidden" aria-hidden="true" />
          <Image src="/icons/close.svg" alt="" width={24} height={24} className="hidden h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:block" aria-hidden="true" />
        </Link>

        {/* Otter with Exam sign */}
        <div aria-hidden="true" className="absolute left-1/2 top-[var(--intro-otter-top)] w-[var(--intro-otter-w)] -translate-x-1/2">
          <div className="absolute left-[var(--intro-sign-left)] top-[var(--intro-sign-top)] z-0 h-[var(--intro-sign-h)] w-[var(--intro-sign-w)] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
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

        {/* Title · description · stats */}
        <div className="flex flex-col items-center px-4 pt-[var(--intro-text-top)] md:px-6">
          <h1 className="max-w-full text-center text-[length:var(--intro-title-size)] font-bold leading-[var(--intro-title-lh)] text-[#334155]">
            โหมดตัวอย่าง — ข้อสอบปนทุกทักษะ
          </h1>
          <p className="mt-[var(--intro-desc-gap)] w-full max-w-[var(--intro-desc-width)] text-center text-[length:var(--intro-desc-size)] font-semibold leading-[var(--intro-desc-lh)] text-[#334155]">
            ลองทำข้อสอบตัวอย่างจริงที่รวมทุกทักษะไว้ในชุดเดียว ไม่ต้องสมัครสมาชิก และไม่บันทึกผล
          </p>
          <div className="mt-[var(--intro-stats-gap)] flex flex-col items-center gap-[11px] md:flex-row">
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                มีทั้งหมด {questionCount} ข้อ
              </p>
            </div>
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                ใช้เวลาประมาณ 5 นาที
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar — ปุ่มเดียว: เริ่มทำข้อสอบ
          sticky bottom-0: กันปุ่มตกไปใต้จอตอนเลื่อน เหมือนหน้า intro ของชุดข้อสอบจริง */}
      <div className="sticky bottom-0 mt-auto flex w-full shrink-0 justify-center bg-white shadow-[0_0_3.3px_rgba(172,172,172,0.25)]">
        <div className="flex w-full max-w-[1061px] items-center justify-center px-4 py-4 md:justify-end md:pr-[var(--intro-bar-pr)] xl:px-0">
          <Link
            href="/demo/exam"
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
            เริ่มทำข้อสอบ
          </Link>
        </div>
      </div>
    </div>
  );
}
