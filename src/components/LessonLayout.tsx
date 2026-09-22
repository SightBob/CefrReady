'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, X, ArrowRight } from 'lucide-react';
import type { LessonStop } from './lesson-stops';

/** Sibling lesson inside the same unit, for the chip dropdown. */
export interface LessonSibling {
  id: number;
  title: string;
  completed?: boolean;
}

interface LessonLayoutProps {
  /** Unit number (1-based) for the pill label. */
  unitNumber: number;
  /** Title shown inside the unit pill (e.g. node title). */
  title: string;
  /** Dropdown entries — each stop in the lesson flow. */
  stops: LessonStop[];
  /** Index of the stop the learner is currently on. */
  activeStop: number;
  /** 0..1 fraction for the top progress bar. */
  progress: number;
  accent: { base: string; dark: string; light: string };
  /** Facts for the green summary card (e.g. 3 rules / tip). */
  summary: { title: string; bullets: string[] };
  /** Bottom-right action (e.g. ตรวจคำตอบ). */
  primaryAction: { label: string; onClick: () => void; disabled?: boolean };
  /** Bottom-left secondary action (ย้อนกลับ). */
  onBack: () => void;
  /** Bottom-left stats for the % ring. */
  stats: { correct: number; total: number };
  /** Called when the learner taps the green คลิกเริ่มใหม่ button. */
  onRestart: () => void;
  /** Called when the learner clicks a numbered stop in the grid. */
  onStopSelect: (index: number) => void;
  /** Called when the learner taps X — returns to the path. */
  onExit: () => void;
  /** Other lessons in the same unit, shown in the chip dropdown. */
  siblings?: LessonSibling[];
  /** Current lesson id (marks the active row in the dropdown). */
  currentLessonId?: number;
  /** Navigate to another lesson. */
  onSiblingSelect?: (id: number) => void;
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
  title,
  stops,
  activeStop,
  progress,
  accent,
  summary,
  primaryAction,
  onBack,
  stats,
  onRestart,
  onStopSelect,
  onExit,
  siblings,
  currentLessonId,
  onSiblingSelect,
  children,
}: LessonLayoutProps) {
  // Dropdown for switching lessons (like the exam's set selector)
  const [isLessonMenuOpen, setIsLessonMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close dropdown on Escape + lock body scroll while open
  useEffect(() => {
    if (!isLessonMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLessonMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isLessonMenuOpen]);
  const progressPct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const answeredPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  // SVG ring: r=20 → circumference ≈ 125.6 (same constants as TestLayout)
  const ringDash = `${answeredPct * 1.256} 125.6`;

  return (
    <div className="flex flex-col bg-white min-h-svh relative">
      {/* ===== Mobile Dot Map — same pattern as TestLayout's mobile nav ===== */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2 px-3 py-4 min-w-max">
            {stops.map((stop, i) => {
              const isActive = i === activeStop;
              let dotClass =
                'w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center transition-all duration-200 shrink-0 ';
              if (isActive) dotClass += 'ring-2 ring-offset-1 scale-110 ';
              dotClass +=
                stop.state === 'done'
                  ? 'text-white '
                  : stop.state === 'active'
                    ? 'text-white '
                    : 'bg-slate-200 text-slate-500';
              return (
                <button
                  key={`${stop.label}-${i}`}
                  type="button"
                  onClick={() => onStopSelect(i)}
                  className={dotClass}
                  style={{
                    background:
                      stop.state === 'done' || stop.state === 'active' ? accent.base : undefined,
                    ...(isActive ? { boxShadow: `0 0 0 2px ${accent.base}` } : {}),
                  }}
                  aria-label={`ขั้นที่ ${i + 1}: ${stop.label}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Body — same container as TestLayout ===== */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full mt-[30px] pb-44">
        {/* Label chip row — gap matches the sidebar/content gap below (gap-6) */}
        <div className="w-full flex items-center gap-6">
          <button
            type="button"
            onClick={() => setIsLessonMenuOpen(true)}
            className="w-72 shrink-0 bg-white shadow-sm border border-slate-100 ps-2 pe-3 py-2 flex items-center gap-2.5 rounded-2xl min-w-0 hover:bg-slate-50 transition-colors"
            aria-haspopup="dialog"
            aria-expanded={isLessonMenuOpen}
          >
            <span
              className="shrink-0 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: accent.light, color: accent.dark }}
            >
              Unit {unitNumber}
            </span>
            <span className="flex-1 text-left text-sm sm:text-[0.9375rem] font-bold truncate" style={{ color: accent.dark }}>
              {title}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-slate-400 transition-transform ${isLessonMenuOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* White box (p-5) wrapping only the progress bar + step counter */}
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

          {/* Exit button — white rounded box with X, like the mockup */}
          <button
            type="button"
            onClick={onExit}
            className="shrink-0 w-[52px] h-[52px] bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-[#616161] hover:bg-slate-50 transition-colors"
            aria-label="ออกจากบทเรียน กลับไปหน้าเส้นทางการเรียน"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Sidebar + Main — same flex structure as TestLayout */}
        <div className="flex gap-6 mt-[1.1875rem]">
          {/* Desktop Navigation Panel — same w-72 column as TestLayout */}
          <aside className="hidden md:block w-72 shrink-0 space-y-4">
            {/* Numbered stop grid — its own box */}
            <div className="rounded-2xl shadow-sm border border-slate-100  top-36 overflow-hidden bg-slate-50">
              <div className="p-[1.1875rem]">
                <div className="grid grid-cols-5 gap-2.5">
                  {stops.map((stop, i) => {
                    const isActive = i === activeStop;
                    const bg =
                      stop.state === 'done'
                        ? '#DCFCE7'
                        : stop.state === 'active'
                          ? accent.light
                          : '#EDEDED';
                    const color = stop.state === 'todo' ? '#64748B' : accent.dark;
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
                          ...(isActive ? { boxShadow: `0 0 0 2px ${accent.base}` } : {}),
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Green summary card — separate box below the numbered grid */}
            <div className="rounded-2xl p-5 text-white" style={{ background: accent.base }}>
              <div className="bg-white/25 rounded-full text-center text-sm font-extrabold py-1.5 px-3 mb-4">
                {summary.title}
              </div>
              <ul className="space-y-2.5 text-sm font-medium">
                {summary.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onRestart}
                className="mt-5 w-full bg-white rounded-xl py-2.5 text-sm font-extrabold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                style={{ boxShadow: `0 3px 0 ${accent.dark}` }}
              >
                <RotateCcw className="w-4 h-4 shrink-0" style={{ color: accent.dark }} aria-hidden="true" />
                คลิกเริ่มครั้งใหม่
              </button>
            </div>
          </aside>

          {/* Main Content — same flex-1 wrapper as TestLayout */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">{children}</div>
          </div>
        </div>
      </div>

      {/* ===== Bottom Bar — same as TestLayout's universal bottom bar ===== */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)]">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-0 md:min-h-[8rem] flex flex-col md:flex-row items-center justify-between gap-3 w-full">
          {/* Progress Ring */}
          <div className="w-full md:w-auto p-2 md:p-0 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 scale-90 md:scale-100 origin-center shrink-0">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="none" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={ringDash}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {answeredPct}%
                </span>
              </div>
              <div className="text-sm hidden sm:block">
                <p className="text-slate-900 font-medium">{stats.correct} ตอบถูก</p>
                <p className="text-slate-500">{stats.total} คะแนน</p>
              </div>
              <p className="text-sm font-medium text-slate-900 sm:hidden">
                {stats.correct}/{stats.total}
              </p>
            </div>
          </div>

          {/* Actions — same pill buttons as TestLayout */}
          <div className="w-full flex items-center gap-2 md:gap-3 md:w-auto justify-center">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] rounded-full flex items-center space-x-1 justify-center bg-white border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">ย้อนกลับ</span>
            </button>
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] rounded-full flex items-center space-x-1 justify-center text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#FDE68A' }}
            >
              <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">
                {primaryAction.label}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== Lesson picker modal — like the exam's set selector ===== */}
      {isLessonMenuOpen && mounted && siblings && siblings.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          onClick={() => setIsLessonMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="เลือกบทเรียน"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[720px] max-h-[80vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-4 p-6 border-b border-slate-100">
              <div className="p-3 rounded-2xl shrink-0" style={{ background: accent.light }}>
                <RotateCcw className="w-5 h-5" style={{ color: accent.dark }} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[1.125rem] font-semibold text-[#525252]">บทเรียนใน Unit {unitNumber}</h2>
                <p className="text-sm font-medium mt-0.5 text-[#525252]">เลือกบทเรียนที่ต้องการเรียน</p>
              </div>
              <button
                onClick={() => setIsLessonMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lesson list */}
            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {siblings.map((s, i) => {
                  const isCurrent = s.id === currentLessonId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setIsLessonMenuOpen(false);
                        if (!isCurrent) onSiblingSelect?.(s.id);
                      }}
                      className={`group block w-full bg-white rounded-2xl border p-5 text-left ${
                        isCurrent ? 'border-current' : 'border-[#BFDFEB]'
                      }`}
                      style={isCurrent ? { borderColor: accent.base } : undefined}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-800 text-[1rem] leading-snug">
                              บทที่ {i + 1} — {s.title}
                            </h3>
                            {isCurrent && (
                              <span className="text-xs font-semibold shrink-0" style={{ color: accent.dark }}>
                                บทปัจจุบัน
                              </span>
                            )}
                            {!isCurrent && s.completed && (
                              <span className="text-xs font-semibold text-emerald-600 shrink-0">✓ ผ่านแล้ว</span>
                            )}
                          </div>
                        </div>
                        <div
                          className="p-2 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: accent.light }}
                        >
                          <ArrowRight className="w-5 h-5" style={{ color: accent.dark }} aria-hidden="true" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
