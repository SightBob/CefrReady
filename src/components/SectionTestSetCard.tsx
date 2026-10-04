import Image from 'next/image';
import Link from 'next/link';
import type { TestSetData } from '@/components/TestSetCard';

interface SectionTestSetCardProps {
  testSet: TestSetData;
  sectionId: string;
  /** Section-level duration (minutes). Test sets have no duration of their own. */
  duration: number | null;
}

/**
 * Test-set card for the section page — Figma 60:188 (Focus on Form).
 * Links to the set detail page (/intro), which then hands over to the quiz.
 * Geometry is taken verbatim from the design frame; the only concession is
 * that Figma's own numbers overflow the card by 5px (13 + 87 + 7 + 30 + 20 =
 * 157 inside a 152px frame), so the meta row renders at y=107 with 15px of
 * visible space below it, exactly as Figma renders it.
 */
export default function SectionTestSetCard({ testSet, sectionId, duration }: SectionTestSetCardProps) {
  return (
    <Link href={`/tests/${sectionId}/${testSet.id}/intro`} className="group block">
      <div className="flex h-[152px] w-full flex-col rounded-[20px] border-[1.4px] border-[#DEEBF6] bg-white px-[21px] pt-[13px] shadow-[2px_2px_0px_0px_#DEEBF6] transition-transform duration-200 hover:-translate-y-0.5">
        {/* Title + description — 87px block (title 26 + gap 10 + description 51) */}
        <div className="flex h-[87px] flex-col gap-[10px]">
          <h3 className="truncate text-[16px] font-semibold leading-[26px] text-[#334155]">
            {testSet.name}
          </h3>
          <p className="line-clamp-2 text-[13px] font-medium leading-[21px] text-[#53657F]">
            {testSet.description ?? ''}
          </p>
        </div>

        {/* Meta row — 30px, arrow chip pinned to the right */}
        <div className="mt-[7px] flex items-center justify-between">
          <div className="flex items-center gap-[12px] text-[13px] font-medium text-[#555555]">
            {duration != null && (
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Image src="/icons/clock.svg" alt="" width={14} height={14} aria-hidden="true" />
                {duration} นาที
              </span>
            )}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Image src="/icons/grid.svg" alt="" width={14} height={14} aria-hidden="true" />
              {testSet.questionCount} ข้อ
            </span>
          </div>
          <div className="flex h-[30px] w-[39px] shrink-0 items-center justify-center rounded-[12px] bg-[#8EBEE6]">
            <Image src="/icons/arrow-right.svg" alt="" width={14} height={14} aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  );
}