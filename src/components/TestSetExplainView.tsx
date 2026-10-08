'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LessonLayout from '@/components/LessonLayout';
import ReviewContent from '@/components/ReviewContent';
import type { LessonSection } from '@/lib/lesson-sections';

// โทนสีตามหมวด — ชุดเดียวกับ TestExplainOverlay
const ACCENTS: Record<string, { base: string; dark: string; light: string }> = {
  'focus-form': { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
  'focus-meaning': { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
  'form-meaning': { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
  listening: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
};
const DEFAULT_ACCENT = { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' };

interface TestSetExplainViewProps {
  title: string;
  intro: string | null;
  tip: string | null;
  sections: LessonSection[];
  sectionId: string;
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

/**
 * หน้าเนื้อหาอธิบายของชุดข้อสอบ — UI เหมือนกด “โหมดทบทวน” ในหน้าสอบทุกจุด
 * (LessonLayout + ReviewContent ชุดเดียวกับ TestExplainOverlay)
 */
export default function TestSetExplainView({
  title,
  intro,
  tip,
  sections,
  sectionId,
  quizHref,
  backHref,
  notice,
  noticeTone = 'info',
  primaryLabel,
  noticeAction,
}: TestSetExplainViewProps) {
  const router = useRouter();

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
        <ReviewContent
          title={title}
          topics={sections}
          intro={intro ?? undefined}
          tip={tip ?? undefined}
        />
      </LessonLayout>
    </div>
  );
}