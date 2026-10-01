'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LessonLayout from '@/components/LessonLayout';
import ReviewContent from '@/components/ReviewContent';
import type { LessonSection } from '@/lib/lesson-sections';

export interface TestExplainContent {
  id: number;
  grammarTopic: string;
  title: string;
  intro: string | null;
  sections: LessonSection[];
  tip: string | null;
}

const ACCENTS: Record<string, { base: string; dark: string; light: string }> = {
  'focus-form': { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
  'focus-meaning': { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
  'form-meaning': { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
  listening: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
};
const DEFAULT_ACCENT = { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' };

export default function TestExplainOverlay({
  explain,
  open,
  sectionId,
  onClose,
}: {
  explain: TestExplainContent | null;
  open: boolean;
  sectionId: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open || !explain) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#F7F7F7]" role="dialog" aria-modal="true" aria-label={`เนื้อหาทบทวน ${explain.title}`}>
      <LessonLayout
        unitNumber={0}
        unitLabel="TEST"
        title={explain.title}
        stops={[{ label: 'เนื้อหาอธิบาย', state: 'active' }]}
        activeStop={0}
        progress={1}
        accent={ACCENTS[sectionId] ?? DEFAULT_ACCENT}
        reviewMode
        primaryAction={{ label: 'ทำข้อสอบต่อ', onClick: onClose }}
        onStopSelect={() => undefined}
        onExit={onClose}
      >
        <ReviewContent title={explain.title} topics={explain.sections} intro={explain.intro ?? undefined} tip={explain.tip ?? undefined} />
      </LessonLayout>
    </div>,
    document.body,
  );
}
