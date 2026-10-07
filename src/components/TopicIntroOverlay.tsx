'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import TestExplainOverlay, { type TestExplainContent } from '@/components/TestExplainOverlay';

/**
 * หน้าที่เด้งเมื่อผู้เรียน "ขึ้นเรื่องใหม่" ในชุดที่รวมหลายเรื่องไว้ด้วยกัน
 *
 * จังหวะ 1 — การ์ด intro ของเรื่องนั้น (ชื่อเรื่อง + บทนำ + กำลังดูเรื่องที่เท่าไร + จำนวนข้อ)
 * จังหวะ 2 — เนื้อหา explain เต็ม ๆ ผ่าน <TestExplainOverlay> ตัวเดียวกับปุ่ม "โหมดทบทวน"
 *
 * โครงและค่าทุกตัวในการ์ดจังหวะ 1 คัดมาจากหน้า /tests/[sectionId]/[setId]/intro
 * (Figma 200:7664 mobile / 75:68796 desktop) ทั้งชุดผ่าน .intro-fluid ใน globals.css
 * ไม่มีค่าที่ประดิษฐ์ขึ้นใหม่ — ต่างกันแค่ข้อความและจำนวนบับเบิล (1–2 ใบตามข้อมูลที่มี)
 */
export default function TopicIntroOverlay({
  explain,
  sectionId,
  questionCount,
  topicNumber,
  topicTotal,
  onStart,
}: {
  explain: TestExplainContent;
  sectionId: string;
  /** จำนวนข้อของเรื่องนี้ (ใช้แสดงในบับเบิล) */
  questionCount: number;
  /** ลำดับเรื่องนี้ 1-based นับเฉพาะเรื่องที่มีเนื้อหา explain */
  topicNumber: number;
  topicTotal: number;
  /** ปิด overlay แล้วกลับไปทำข้อสอบต่อ (ใช้ทั้งปุ่ม X และปุ่มหลังอ่านเนื้อหา) */
  onStart: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'intro' | 'explain'>('intro');

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (step === 'explain') {
    // จังหวะ 2 — ใช้ overlay ตัวเดียวกับ "โหมดทบทวน" ทั้งดุ้น (LessonLayout + ReviewContent)
    return (
      <TestExplainOverlay explain={explain} open sectionId={sectionId} onClose={onStart} />
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-[#F7F7F7]"
      role="dialog"
      aria-modal="true"
      aria-label={`เริ่มเรื่อง ${explain.title}`}
    >
      <div className="intro-fluid flex min-h-[100vh] flex-col bg-[#F7F7F7]">
        <div className="relative mx-auto mt-[var(--intro-card-mt)] h-[var(--intro-card-h)] w-[var(--intro-card-w)] max-w-full shrink-0 rounded-[30px] bg-white">
          {/* Close — ข้ามไปทำข้อสอบเลย (Figma 200:7665 → 75:68807) */}
          <button
            type="button"
            onClick={onStart}
            aria-label="ข้ามไปทำข้อสอบ"
            className="absolute right-[var(--intro-close-right)] top-[var(--intro-close-top)] flex h-[var(--intro-close-h)] w-[var(--intro-close-w)] items-center justify-center rounded-[8px] border-b-[length:var(--intro-close-border)] border-r-[length:var(--intro-close-border)] border-[#C0BFB7] bg-white shadow-[0_0_0.3px_rgba(0,0,0,0.25)] md:border-l md:border-t"
          >
            <Image src="/tests/close-card.svg" alt="" width={20} height={20} unoptimized className="h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:hidden" aria-hidden="true" />
            <Image src="/icons/close.svg" alt="" width={24} height={24} className="hidden h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:block" aria-hidden="true" />
          </button>

          {/* Otter with Exam sign — ใช้ node เดียวกับหน้า intro ของชุด */}
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

          <div className="flex flex-col items-center px-4 pt-[var(--intro-text-top)] md:px-6">
            <h1 className="max-w-full text-center text-[length:var(--intro-title-size)] font-bold leading-[var(--intro-title-lh)] text-[#334155]">
              {explain.title}
            </h1>
            {explain.intro && (
              <p className="mt-[var(--intro-desc-gap)] w-full max-w-[var(--intro-desc-width)] text-center text-[length:var(--intro-desc-size)] font-semibold leading-[var(--intro-desc-lh)] text-[#334155]">
                {explain.intro}
              </p>
            )}
            <div className="mt-[var(--intro-stats-gap)] flex flex-col items-center gap-[11px] md:flex-row">
              {topicTotal > 1 && (
                <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
                  <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                    เรื่องที่ {topicNumber} จาก {topicTotal}
                  </p>
                </div>
              )}
              <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
                <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                  มีทั้งหมด {questionCount} ข้อ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar — โครงเดียวกับหน้า intro ของชุด (200:7727 → 75:68810) */}
        <div className="mt-auto flex w-full shrink-0 justify-center bg-white shadow-[0_0_3.3px_rgba(172,172,172,0.25)]">
          <div className="flex w-full max-w-[1061px] items-center justify-center px-4 py-4 md:justify-end md:pr-[var(--intro-bar-pr)] xl:px-0">
            <button
              type="button"
              onClick={() => setStep('explain')}
              className="flex h-[var(--intro-cta-h)] w-full max-w-[var(--intro-cta-w)] items-center justify-center rounded-[14px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-center text-[length:var(--intro-cta-size)] font-semibold text-[#524924] xl:h-[49px] xl:w-[216px] xl:max-w-none xl:rounded-[14px] xl:border xl:border-b-4 xl:border-r-[3px] xl:text-[16px]"
            >
              อ่านเนื้อหาเรื่องนี้
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
