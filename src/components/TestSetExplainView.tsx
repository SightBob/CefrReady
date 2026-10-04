'use client';

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
        primaryAction={{ label: 'ทำข้อสอบต่อ', onClick: () => router.push(quizHref) }}
        onStopSelect={() => undefined}
        onExit={() => router.push(backHref)}
      >
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