'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Sparkle, Pencil, Gem, ChevronDown } from 'lucide-react';
import type { TapExercise } from '@/content/units-path-lessons';

/** State reported upward so the lesson chrome (bottom bar) can react. */
export interface TapFlowState {
  current: number;
  total: number;
  answeredCurrent: boolean;
  correctCount: number;
  finished: boolean;
}

export interface TapSelectFlowHandle {
  /** Advance: answer revealed → go to the next prompt (or finish). */
  next: () => void;
}

const LETTERS = ['A', 'B'] as const;

export default function TapSelectFlow({
  exercise,
  tip,
  accent,
  onStateChange,
  registerAdvance,
}: {
  exercise: TapExercise;
  /** Lesson tip shown in the yellow "คำนะสำหรับบทนี้" box. */
  tip?: string | null;
  accent: { base: string; dark: string; light: string };
  onStateChange?: (state: TapFlowState) => void;
  registerAdvance?: (fn: () => void) => void;
}) {
  const items = exercise.items;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<0 | 1 | null>>(() => items.map(() => null));
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [tipOpen, setTipOpen] = useState(true);

  const item = items[current];
  const answered = answers[current] !== null;
  const finished = answers.every((a) => a !== null);
  const correctCount = useMemo(
    () => answers.filter((a, i) => a !== null && a === items[i]?.correct).length,
    [answers, items]
  );

  const choose = (choice: 0 | 1) => {
    if (answered) return;
    setAnswers((prev) => prev.map((a, i) => (i === current ? choice : a)));
  };

  const next = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, items.length - 1));
  }, [items.length]);

  // Register the advance function so the parent's primary button can drive the flow.
  useEffect(() => {
    registerAdvance?.(next);
  }, [registerAdvance, next]);

  // Report state upward for the bottom bar.
  useEffect(() => {
    onStateChange?.({
      current,
      total: items.length,
      answeredCurrent: answered,
      correctCount,
      finished,
    });
  }, [onStateChange, current, items.length, answered, correctCount, finished]);

  if (!item) return null;
  const isLast = current === items.length - 1;

  return (
    <div className="space-y-6">
      {/* Yellow "คำนะสำหรับบทนี้" box */}
      {tip?.trim() && (
        <section
          className="rounded-2xl border-2 p-4 sm:p-5"
          style={{ borderColor: '#F5D66B', background: '#FFFBEA' }}
        >
          <div className="flex items-start gap-3">
            <Sparkle size={18} className="shrink-0 mt-0.5" style={{ color: '#E8B931' }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-[#8A6D1C] mb-1">คำนะสำหรับบทนี้</p>
              {tipOpen && (
                <p className="text-sm font-medium text-[#8A6D1C] leading-relaxed whitespace-pre-line">{tip}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTipOpen((v) => !v)}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-extrabold text-[#8A6D1C] transition-colors hover:brightness-95"
              style={{ background: '#FBEFD0' }}
              aria-expanded={tipOpen}
            >
              ดูตัวอย่าง
              <ChevronDown size={14} className={`transition-transform ${tipOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Instruction */}
      <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">{exercise.title || 'เลือกข้อที่เป็นประโยคได้ถูกต้อง'}</h2>

      {/* Current prompt — one at a time */}
      <div key={current} style={{ animation: 'fadeIn 0.3s ease-out both' }}>
        {item.prompt.trim() && (
          <p className="text-base sm:text-lg font-bold text-slate-700 mb-4">
            {current + 1}. {item.prompt}
          </p>
        )}

        {/* A / B — full-width rows like the exam page */}
        <div className="space-y-3">
          {([0, 1] as const).map((choice) => {
            const isA = choice === 0;
            const label = isA ? item.choiceA : item.choiceB;
            const selected = answers[current] === choice;
            const showCorrect = answered && item.correct === choice;
            const showWrong = answered && selected && item.correct !== choice;

            return (
              <button
                key={choice}
                type="button"
                onClick={() => choose(choice)}
                disabled={answered}
                className={`w-full flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  showCorrect
                    ? 'border-emerald-400 bg-emerald-50'
                    : showWrong
                      ? 'border-rose-400 bg-rose-50'
                      : answered
                        ? 'border-slate-100 bg-white opacity-60'
                        : selected
                          ? 'border-slate-300 bg-slate-100'
                          : 'border-slate-100 bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span
                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black ${
                    showCorrect
                      ? 'bg-emerald-500 text-white'
                      : showWrong
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#8B8B8B] text-white'
                  }`}
                  aria-hidden="true"
                >
                  {LETTERS[choice]}
                </span>
                <span className="min-w-0 flex-1 text-sm sm:text-base font-semibold text-slate-700">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation section — after answering */}
        {answered && (
          <div className="mt-6" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <p className="text-base font-extrabold text-slate-800">เฉลยคำสั่งนี้</p>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-sky-700"
                style={{ background: '#EAF4FB' }}
              >
                <Search size={12} aria-hidden="true" />
                คำตอบที่ถูกคือ {LETTERS[item.correct]} — {item.correct === 0 ? item.choiceA : item.choiceB}
              </span>
            </div>

            {/* +50 note input (not scored yet) */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Pencil size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={notes[current] ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [current]: e.target.value }))}
                placeholder="เขียนอธิบายสั้นๆ เพื่อรับ + 50 คะแนน"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold text-cyan-700"
                style={{ background: '#D6F3F7' }}
              >
                <Gem size={12} aria-hidden="true" /> + 50
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress dots (subtle, in-content) */}
      <div className="flex items-center justify-center gap-2 pt-2" aria-hidden="true">
        {items.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === current ? 20 : 8,
              height: 8,
              background: answers[i] !== null ? accent.base : '#E2E8F0',
            }}
          />
        ))}
      </div>
      {!isLast && <span className="sr-only">ข้อ {current + 1} จาก {items.length}</span>}
    </div>
  );
}
