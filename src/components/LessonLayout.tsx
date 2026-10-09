"use client";

import { X } from 'lucide-react';
import type { LessonStop } from './lesson-stops';

interface LessonLayoutProps {
  /** Unit number (1-based) for the pill label. */
  unitNumber: number;
  /** Title shown inside the unit pill (e.g. node title). */
  title: string;
  /** Custom label for the pill instead of "Unit {unitNumber}". */
  unitLabel?: string;
  /** Dropdown entries — each stop in the lesson flow. */
  stops: LessonStop[];
  /** Index of the stop the learner is currently on. */
  activeStop: number;
  /** 0..1 fraction for the top progress bar. */
  progress: number;
  accent: { base: string; dark: string; light: string };
  /** Bottom-right action (e.g. ตรวจคำตอบ). */
  primaryAction: { label: string; onClick: () => void; disabled?: boolean };
  /** Extra pill next to the primary action (e.g. โหมดทบทวน) — omitted when undefined. */
  secondaryAction?: { label: string; onClick: () => void; active?: boolean };
  /** Review mode: hide the progress bar, step dots and sidebar — only the chip,
   *  exit button and review content remain (per UI reference). */
  reviewMode?: boolean;
  /** Called when the learner clicks a numbered stop in the grid. */
  onStopSelect: (index: number) => void;
  /** Called when the learner taps X — returns to the path. */
  onExit: () => void;
  /** Main content (question card, concept text, …). */
  children: React.ReactNode;
}

/**
 * Lesson chrome with the SAME layout architecture as TestLayout (Exam page):
 * identical container widths, header structure, chip row, sidebar column,
 * and bottom bar dimensions. Only content/colors differ (unit accent theme).
 */
export default function LessonLayout({
  unitNumber,
  unitLabel,
  title,
  stops,
  activeStop,
  progress,
  accent,
  primaryAction,
  secondaryAction,
  reviewMode = false,
  onStopSelect,
  onExit,
  children,
}: LessonLayoutProps) {
// ป้ายชื่อบทเรียน/ชุดเป็นแบบคงที่ — ไม่มีการเลือกสลับบทตอนเรียนอีกต่อไป

  const progressPct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <div className={`flex flex-col bg-[#F7F7F7] min-h-svh relative ${reviewMode ? 'font-ibm' : ''}`}>
      {/* ===== Mobile Dot Map — same pattern as TestLayout's mobile nav ===== */}
      <div className={`${reviewMode ? 'hidden' : ''} md:hidden sticky top-0 z-30 border-b border-slate-200 shadow-sm`}>
        <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2 px-3 py-4 min-w-max">
            {stops.map((stop, i) => {
              // Same status colors as the desktop grid (mobile dot map).
              const bg =
                stop.state === 'active'
                  ? '#719CC0'
                  : stop.state === 'done'
                    ? '#DCEFFF'
                    : '#F8F8F8';
              const color = stop.state === 'active' ? '#FFFFFF' : '#64748B';
              return (
                <button
                  key={`${stop.label}-${i}`}
                  type="button"
                  onClick={() => onStopSelect(i)}
                  className="w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center transition-all duration-200 shrink-0"
                  style={{ background: bg, color }}
                  aria-label={`ขั้นที่ ${i + 1}: ${stop.label}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Body — same container as TestLayout =====
          Review mode (หน้า Explain) ใช้ความกว้าง 735px + padding 11px ตาม design. */}
      <div className={`${reviewMode ? 'max-w-[735px] px-[11px] pt-4 max-md:px-[17px]' : 'max-w-[1360px] px-4 sm:px-6 lg:px-8 mt-[30px]'} mx-auto w-full pb-44 max-md:pb-[101px]`}>
        {/* Label chip row — gap matches the sidebar/content gap below (gap-6).
            In review mode the row holds only the chip + exit button → push X right. */}
        <div className={`w-full flex items-center min-md:gap-6 max-md:gap-0 ${reviewMode ? 'justify-between' : ''}`}>
          {/* ป้ายชื่อบทเรียน/ชุดแบบคงที่ — แสดงชื่ออย่างเดียว กดไม่ได้ */}
          <div
            className={`shrink-0 text-[#638AAA] bg-white shadow-[3px_3px_0_0_#D5D3D3] border border-slate-100 flex items-center min-w-0 ${
              reviewMode
                ? 'w-[calc(100%_-_52px)] h-[45px] px-5 py-3 rounded-[12px] justify-between gap-[84px] max-md:h-[39px] max-md:px-[10px] max-md:py-[12px] max-md:rounded-[10px] max-md:gap-2'
                : 'w-72 ps-2 pe-3 py-2 gap-2.5 rounded-[12px]'
            }`}
          >
            {/* ป้ายหน่วย (เช่น "Unit 1" / "TEST") แสดงเฉพาะโหมดบทเรียน —
                โหมดทบทวน/หน้า Explain แสดงชื่อชุดข้อสอบอย่างเดียวตาม design */}
            {!reviewMode && (
              <span
                className="shrink-0 text-[13px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: accent.light}}
              >
                {unitLabel ?? `Unit ${unitNumber}`}
              </span>
            )}
            <span className="flex-1 text-left text-[15px] font-semibold leading-normal truncate max-md:text-[12px]">
              {title}
            </span>
          </div>

          {/* White box (p-5) wrapping only the progress bar + step counter —
              hidden in review mode per UI reference */}
          {!reviewMode && (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex items-center gap-3 min-w-0">
            <div className="flex-1 h-[14px] rounded-full bg-[#E3E2E2] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: '#58CC02',
                  boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.4)',
                }}
              />
            </div>
            <span className="shrink-0 text-xs sm:text-sm font-bold text-slate-500 whitespace-nowrap">
              {activeStop + 1}/{stops.length} ขั้นตอน
            </span>
          </div>
          )}

          {/* Exit button — white rounded box with X, like the mockup */}
          <button
            type="button"
            onClick={onExit}
            className={`shrink-0 bg-white rounded-[8px] shadow-[3px_3px_0_0_#D5D3D3] border border-slate-100 flex items-center justify-center text-[#616161] hover:bg-slate-50 transition-colors ${
              reviewMode ? 'w-[46px] h-[41px] max-md:w-[38px] max-md:h-[38px]' : 'p-[11px]'
            }`}
            aria-label="ออกจากบทเรียน กลับไปหน้าเส้นทางการเรียน"
          >
            <X className="size-[24px] font-semibold text-[#7D7451] max-md:size-[20px]" aria-hidden="true" />
          </button>
        </div>

        {/* Sidebar + Main — same flex structure as TestLayout.
            Sidebar is hidden in review mode per UI reference. */}
        <div className={`flex gap-6 ${reviewMode ? 'mt-[14px] max-md:mt-[15px]' : 'mt-[1.1875rem] md:flex'}`}>
          {!reviewMode && (
          <aside className="hidden md:block w-72 shrink-0 space-y-4">
            {/* Numbered stop grid — its own box */}
            <div className="rounded-2xl shadow-sm border border-slate-100  top-36 overflow-hidden bg-white">
              <div className="p-[1.1875rem]">
                <div className="grid grid-cols-5 gap-2.5">
                  {stops.map((stop, i) => {
                    const isActive = i === activeStop;
                    // Status colors per spec: not-done #F8F8F8, in-progress
                    // (answered) #DCEFFF, currently-on-screen #719CC0 (white text).
                    const bg =
                      stop.state === 'active'
                        ? '#719CC0'
                        : stop.state === 'done'
                          ? '#DCEFFF'
                          : '#F8F8F8';
                    const color = stop.state === 'active' ? '#FFFFFF' : '#64748B';
                    return (
                      <button
                        key={`${stop.label}-${i}`}
                        type="button"
                        onClick={() => onStopSelect(i)}
                        aria-label={`${stop.label} (ขั้นที่ ${i + 1})`}
                        aria-current={isActive ? 'step' : undefined}
                        className="w-9 h-9 rounded-lg font-medium text-xs flex items-center justify-center transition-all duration-200"
                        style={{
                          background: bg,
                          color,
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
          )}

          {/* Main Content — same flex-1 wrapper as TestLayout */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">{children}</div>
          </div>
        </div>
      </div>

      {/* ===== Bottom Bar — same as TestLayout's universal bottom bar ===== */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)]">
        <div className={`${reviewMode ? 'max-w-[735px] px-[11px] pt-4 pb-8 md:min-h-[97px] max-md:py-[18px] max-md:pb-[max(18px,env(safe-area-inset-bottom))] max-md:px-[32px]' : 'max-w-[1360px] px-4 md:min-h-[8rem]'} mx-auto flex items-center justify-end gap-3 w-full`}>
          {/* Actions — same pill buttons as TestLayout, aligned right */}
          <div className="flex items-center gap-2 md:gap-3 justify-end">
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] rounded-full flex items-center space-x-1 justify-center border-2 transition-colors"
                style={
                  secondaryAction.active
                    ? { background: accent.base, borderColor: accent.base, color: '#fff' }
                    : { background: '#fff', borderColor: accent.base, color: accent.dark }
                }
              >
                <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">
                  {secondaryAction.label}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={`flex-1 md:flex-none max-md:px-10 md:w-[216px] h-14 md:h-[49px] max-md:h-[44px] rounded-[14px] flex items-center justify-center py-[10px] space-x-1 text-[1rem] text-[#524924] transition-colors bg-[#FFF0AE] border-b-[4px] border-r-[4px] border-[#FFDB40] hover:bg-[#FFEA8F]'
            }`}
            >
              <span className="text-[1rem] text-center font-semibold whitespace-nowrap max-md:text-[15px]">
                {primaryAction.label}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
