'use client';

/**
 * Category breakdown card — Figma 172:565 … 172:766 (profile / 60:820 file).
 *
 * Structure comes straight out of get_design_context for node 172:565:
 *   header row  → 33px icon tile (#e6f0f8, radius 7) + 95px text column
 *   CEFR badge  → green (#edfce5 / #5b9530) when passed, plain (#f2f8ee / #64748b) otherwise
 *   progress    → 8px track (#e3e2e2, radius 9999) with a coloured fill + white gloss overlay
 *   footer chip → #f0f0f0, radius 8, 34px tall, score + descriptor
 *
 * All colours/sizes are read from the Figma node, not invented.
 */
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import type { CefrLevel } from '@/lib/cefr-estimator';

interface ProgressCategoryCardProps {
  testTypeId: string;
  testTypeName: string;
  averageScore: number;
  testsTaken: number;
}

/** Pass mark = B1 (CEFR B2 cutoff in src/lib/cefr-estimator). */
const PASS_SCORE = 52;

const BADGE_PASSED = {
  bg: 'bg-[#edfce5]',
  text: 'text-[#5b9530]',
};
const BADGE_PLAIN = {
  bg: 'bg-[#f2f8ee]',
  text: 'text-[#64748b]',
};

function scoreDescriptor(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 52) return 'Needs Practice';
  return 'Needs Practice';
}

function barColor(score: number): string {
  if (score >= 70) return 'bg-[#58cc02]';
  return 'bg-[#e9cd62]';
}

export default function ProgressCategoryCard({
  testTypeId,
  testTypeName,
  averageScore,
  testsTaken,
}: ProgressCategoryCardProps) {
  const level: CefrLevel = estimateCefrLevel(averageScore);
  const passed = averageScore >= PASS_SCORE;
  const badge = passed ? BADGE_PASSED : BADGE_PLAIN;

  // Keep the fill inside the track — Figma widths never overflow the 296px rail.
  const fillWidth = Math.max(0, Math.min(100, averageScore));

  return (
    <div
      data-testid={`category-card-${testTypeId}`}
      className="bg-white border border-[#ededed] rounded-[14px] px-[12px] pt-[8px] pb-[13px] pr-[14px] flex flex-col justify-self-stretch self-stretch min-w-0 h-[166px] lg:h-full"
    >
      <div className="flex flex-col gap-[20px] min-w-0">
        <div className="flex flex-col gap-[16px] min-w-0">
          {/* Header: icon + name/tests-taken + CEFR badge */}
          <div className="flex items-center justify-between gap-[8px] min-w-0">
            <div className="flex items-center gap-[10px] min-w-0">
              <div
                className="bg-[#e6f0f8] rounded-[7px] size-[33px] shrink-0 flex items-center justify-center"
                aria-hidden="true"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/progress/pen.svg" alt="" width={16} height={16} className="size-[16px]" />
              </div>
              <div className="min-w-0 w-[95px] shrink">
                <p className="font-semibold text-[14px] text-[#555] leading-[normal] truncate">
                  {testTypeName}
                </p>
                <p className="font-medium text-[12px] text-[#64748b] leading-[20px] truncate">
                  {testsTaken > 0 ? `${testsTaken} ครั้ง ที่ทำ` : 'ยังไม่เคยทำ'}
                </p>
              </div>
            </div>

            <div
              className={`${badge.bg} h-[30px] px-[12px] rounded-[8px] shrink-0 flex items-center gap-[8px]`}
            >
              <span className={`${badge.text} font-bold text-[14px] leading-[32px]`}>{level}</span>
              {passed && (
                <span className={`${badge.text} font-semibold text-[11px] leading-[20px] whitespace-nowrap`}>
                  ผ่านเกณฑ์
                </span>
              )}
            </div>
          </div>

          {/* Progress rail — Figma 172:584 */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[#64748b] text-[14px] leading-[20px]">Progress</p>
              <p className="text-[#334155] text-[12px] font-medium leading-[20px]">
                {averageScore.toFixed(2)}%
              </p>
            </div>
            <div className="pt-[4px] flex flex-col min-w-0">
              <div className="flex h-[8px] items-center">
                <div className="relative flex-[1_0_0] min-w-px h-[8px] flex-col items-start justify-center overflow-clip rounded-[9999px] bg-[#e3e2e2] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]">
                  <div
                    className={`${barColor(averageScore)} flex flex-col items-start min-h-px relative rounded-[9999px] h-full`}
                    style={{ width: `${fillWidth}%` }}
                  >
                    <div className="bg-[rgba(255,255,255,0.4)] h-[4px] relative rounded-[9999px] shrink-0 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer chip — Figma 172:595 */}
        <div className="bg-[#f0f0f0] rounded-[8px] h-[34px] px-[12px] flex items-center justify-center gap-[8px] w-full">
          <span className="text-[#64748b] font-bold text-[14px] leading-[32px]">
            {averageScore.toFixed(2)}%
          </span>
          <span className="text-[#64748b] font-medium text-[12px] leading-[20px]">
            {scoreDescriptor(averageScore)}
          </span>
        </div>
      </div>
    </div>
  );
}