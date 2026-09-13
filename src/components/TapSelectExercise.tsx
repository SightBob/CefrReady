'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { TapExercise } from '@/content/units-path-lessons';

interface Props {
  exercise: TapExercise;
  accent: { base: string; dark: string; light: string };
}

/**
 * Tap & Select — ฝึกแยกถูก/ผิด
 * Each item shows its own prompt and exactly 2 choices (editable per item).
 * The learner taps one; feedback is immediate (green/red). Footer tracks
 * progress and allows retry.
 */
export default function TapSelectExercise({ exercise, accent }: Props) {
  const [answers, setAnswers] = useState<Record<number, 0 | 1>>({});

  const total = exercise.items.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = exercise.items.reduce(
    (acc, it, i) => acc + (answers[i] !== undefined && answers[i] === it.correct ? 1 : 0),
    0
  );
  const allAnswered = answeredCount === total;

  const pick = (itemIndex: number, choice: 0 | 1) => {
    if (answers[itemIndex] !== undefined) return; // locked once answered
    setAnswers((a) => ({ ...a, [itemIndex]: choice }));
  };

  const reset = () => setAnswers({});

  if (total === 0) return null;

  return (
    <div className="rounded-2xl border-2 p-4 sm:p-5" style={{ borderColor: accent.light }}>
      <p className="text-xs font-extrabold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: accent.dark }}>
        ✨ {exercise.title}
      </p>

      <ul className="space-y-3">
        {exercise.items.map((item, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const isCorrect = answered && chosen === item.correct;
          const choices: Array<{ label: string; idx: 0 | 1 }> = [
            { label: item.choiceA, idx: 0 },
            { label: item.choiceB, idx: 1 },
          ];

          return (
            <li key={i} className="bg-white rounded-xl border-2 border-slate-100 p-3.5">
              <p className="font-semibold text-sm sm:text-base text-slate-800 mb-2.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white mr-2 align-middle" style={{ background: accent.base }}>
                  {i + 1}
                </span>
                {item.prompt}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {choices.map(({ label, idx }) => {
                  const isChosen = answered && chosen === idx;
                  const isRightOne = item.correct === idx;
                  let cls = 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50';
                  if (answered) {
                    if (isRightOne) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
                    else if (isChosen) cls = 'border-rose-400 bg-rose-50 text-rose-600';
                    else cls = 'border-slate-100 text-slate-300';
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => pick(i, idx)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-default ${cls}`}
                    >
                      {answered && isRightOne && <CheckCircle size={16} weight="fill" className="text-emerald-500" aria-hidden="true" />}
                      {answered && isChosen && !isRightOne && <XCircle size={16} weight="fill" className="text-rose-400" aria-hidden="true" />}
                      {label}
                    </button>
                  );
                })}
              </div>
              {answered && !isCorrect && (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  คำตอบที่ถูกคือ “{item.correct === 0 ? item.choiceA : item.choiceB}”
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Progress footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          {allAnswered
            ? `ทำครบแล้ว — ถูก ${correctCount}/${total} ข้อ`
            : `แตะตอบ ${answeredCount}/${total} ข้อ`}
        </p>
        {answeredCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: accent.dark, background: accent.light }}
          >
            <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
            ลองใหม่
          </button>
        )}
      </div>
      {allAnswered && correctCount === total && (
        <p className="mt-2 text-sm font-extrabold text-emerald-600">🎉 เยี่ยมมาก! ตอบถูกทุกข้อ</p>
      )}
    </div>
  );
}
