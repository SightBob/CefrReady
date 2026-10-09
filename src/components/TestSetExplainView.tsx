'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LessonLayout from '@/components/LessonLayout';
import ReviewContent from '@/components/ReviewContent';
import { markSetExplainRead } from '@/lib/test-explain-read';
import type { LessonSection } from '@/lib/lesson-sections';

// โทนสีตามหมวด — ชุดเดียวกับ TestExplainOverlay
const ACCENTS: Record<string, { base: string; dark: string; light: string }> = {
  'focus-form': { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
  'focus-meaning': { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
  'form-meaning': { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
  listening: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
};
const DEFAULT_ACCENT = { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' };

/** หนึ่งหน้าอธิบาย (เรื่อง) ที่จะแสดงต่อกันในหน้า /explain ระดับชุด */
export interface SetExplainEntry {
  title: string;
  intro: string | null;
  tip: string | null;
  sections: LessonSection[];
}

interface TestSetExplainViewProps {
  /** ชื่อชุดข้อสอบ — ใช้เป็นหัวเรื่องบน LessonLayout */
  title: string;
  /**
   * หน้าอธิบายทุกอันที่ผูกไว้กับชุด เรียงตามลำดับที่แอดมินเลือก —
   * แสดงต่อกันเป็นภาพรวมก่อนเข้าสอบ
   */
  entries: SetExplainEntry[];
  sectionId: string;
  /** id ของชุด — mark ว่าอ่านเนื้อหาระดับชุดแล้วเพื่อไม่ให้หน้าสอบเด้งซ้ำ (ไม่ส่ง = ไม่ mark) */
  setId?: number;
  /** ปุ่มหลัก “ทำข้อสอบต่อ” → หน้าสอบ */
  quizHref: string;
  /** ปุ่ม X → กลับไปหน้า /intro */
  backHref: string;
  /** แบนเนอร์เหนือเนื้อหา — ใช้เฉพาะโหมดพรีวิวของแอดมิน (ไม่ส่ง = หน้าเรียนปกติ) */
  notice?: string;
  /** 'warning' = เนื้อหานี้ผู้เรียนยังไม่เห็น */
  noticeTone?: 'info' | 'warning';
  /** ข้อความปุ่มหลัก (ไม่ส่ง = “ทำข้อสอบต่อ”) */
  primaryLabel?: string;
  /** ลิงก์ในแบนเนอร์ (ใช้เฉพาะโหมดพรีวิวของแอดมิน เช่น เปิดหน้าทำข้อสอบจริง) */
  noticeAction?: { label: string; href: string };
}

/** compat: admin preview ยังส่งข้อมูลอันเดียวแบบฟิลด์เก่าได้ */
export function toEntries(single: {
  title: string;
  intro: string | null;
  tip: string | null;
  sections: LessonSection[];
}): SetExplainEntry[] {
  return [single];
}

/**
 * หน้าเนื้อหาอธิบายของชุดข้อสอบ — UI เหมือนกด “โหมดทบทวน” ในหน้าสอบทุกจุด
 * (LessonLayout + ReviewContent ชุดเดียวกับ TestExplainOverlay)
 *
 * รองรับหลายหน้าอธิบาย: เนื้อหาแต่ละอันแสดงต่อกันตามลำดับที่ผูกไว้
 * (อันไหนถูกเลือกก่อนแสดงบน) — เหมาะกับชุดรวมหลายเรื่องที่อยากให้เห็นภาพรวมก่อนสอบ
 */
export default function TestSetExplainView({
  title,
  entries,
  sectionId,
  setId,
  quizHref,
  backHref,
  notice,
  noticeTone = 'info',
  primaryLabel,
  noticeAction,
}: TestSetExplainViewProps) {
  const router = useRouter();

  // จำไว้ว่าผู้เรียนเพิ่งอ่านเนื้อหาระดับชุดแล้ว — หน้าสอบจะไม่เด้ง overlay เนื้อหา
  // เดียวกันซ้ำอีกรอบ (แต่ถ้าเข้า URL หน้าสอบตรง ๆ โดยไม่ผ่าน /explain ก็ยังเด้งเหมือนเดิม)
  useEffect(() => {
    if (setId != null) markSetExplainRead(sectionId, setId);
  }, [setId, sectionId]);

  return (
    <div className="min-h-svh bg-[#F7F7F7]">
      <LessonLayout
        unitNumber={0}
        unitLabel="TEST"
        title={title}
        stops={[{ label: 'เนื้อหาอธิบาย', state: 'active' }]}
        activeStop={0}
        progress={1}
        accent={ACCENTS[sectionId] ?? DEFAULT_ACCENT}
        reviewMode
        primaryAction={{ label: primaryLabel ?? 'ทำข้อสอบต่อ', onClick: () => router.push(quizHref) }}
        onStopSelect={() => undefined}
        onExit={() => router.push(backHref)}
      >
        {notice && (
          <div
            role="status"
            className={`mb-4 rounded-2xl border-[1.4px] px-4 py-3 text-sm font-semibold leading-6 ${
              noticeTone === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-sky-200 bg-sky-50 text-sky-800'
            }`}
          >
            <p>{notice}</p>
            {noticeAction && (
              <Link
                href={noticeAction.href}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block font-bold underline underline-offset-2"
              >
                {noticeAction.label}
              </Link>
            )}
          </div>
        )}

        {entries.map((entry, index) => (
          <div key={`${entry.title}-${index}`} className={index > 0 ? 'mt-8' : undefined}>
            {entries.length > 1 && (
              <h2 className="mb-2 flex items-center gap-2 text-[18px] font-bold text-[#334155]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF0AE] text-[13px] font-bold text-[#6C5F2D]">
                  {index + 1}
                </span>
                {entry.title}
              </h2>
            )}
            <ReviewContent
              title={entry.title}
              topics={entry.sections}
              intro={entry.intro ?? undefined}
              tip={entry.tip ?? undefined}
            />
          </div>
        ))}
      </LessonLayout>
    </div>
  );
}
