'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, CaretDown, ArrowRight, Check } from '@phosphor-icons/react';
import type { QuizSet, QuizQuestion } from '@/content/units-path-lessons';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function QuestionCard({
  question,
  index,
  total,
  accent,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  accent: { base: string; dark: string; light: string };
  selected: number | null;
  onSelect: (optionIndex: number) => void;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const answered = selected !== null;
  const isCorrect = selected === question.answerIndex;

  return (
    <section className="bg-white rounded-2xl border-2 border-slate-100 p-5 sm:p-6 shadow-sm">
      {/* Progress chip */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold" style={{ color: accent.dark }}>
          ข้อ {index + 1}/{total}
        </h2>
        {answered && (
          <span
            className="text-xs font-extrabold px-3 py-1 rounded-full"
            style={{
              background: isCorrect ? '#f0fdf4' : '#fef2f2',
              color: isCorrect ? '#16a34a' : '#ef4444',
            }}
          >
            {isCorrect ? 'ถูกต้อง ✓' : 'ยังไม่ถูก ✗'}
          </span>
        )}
      </div>

      {/* Fill-in sentence */}
      <p className="text-base sm:text-lg font-semibold text-slate-800 mb-5 leading-relaxed">
        {question.sentence.split('____').map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <span
                className="inline-block min-w-[72px] mx-1 border-b-4 rounded-sm align-bottom"
                style={{
                  borderColor: answered
                    ? isCorrect
                      ? '#22c55e'
                      : '#f87171'
                    : accent.base,
                }}
                aria-label="ช่องเติมคำ"
              />
            )}
          </React.Fragment>
        ))}
      </p>

      {/* Options — card/radio style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="ตัวเลือกคำตอบ">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const revealState = answered
            ? i === question.answerIndex
              ? 'correct'
              : isSelected
                ? 'wrong'
                : 'dim'
            : isSelected
              ? 'selected'
              : 'idle';

          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={answered}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-150 ${
                revealState === 'dim' ? 'opacity-45' : ''
              } ${answered ? 'cursor-default' : 'hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'}`}
              style={{
                borderColor:
                  revealState === 'correct'
                    ? '#22c55e'
                    : revealState === 'wrong'
                      ? '#f87171'
                      : revealState === 'selected'
                        ? accent.base
                        : '#e2e8f0',
                background:
                  revealState === 'correct'
                    ? '#f0fdf4'
                    : revealState === 'wrong'
                      ? '#fef2f2'
                      : revealState === 'selected'
                        ? accent.light
                        : '#ffffff',
                boxShadow:
                  revealState === 'selected' && !answered
                    ? `0 3px 0 ${accent.base}`
                    : '0 2px 0 #e2e8f0',
              }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 border-2"
                style={{
                  borderColor:
                    revealState === 'correct'
                      ? '#22c55e'
                      : revealState === 'wrong'
                        ? '#f87171'
                        : revealState === 'selected'
                          ? accent.base
                          : '#cbd5e1',
                  color:
                    revealState === 'correct'
                      ? '#16a34a'
                      : revealState === 'wrong'
                        ? '#ef4444'
                        : revealState === 'selected'
                          ? accent.dark
                          : '#64748b',
                  background: '#ffffff',
                }}
                aria-hidden="true"
              >
                {LETTERS[i]}
              </span>
              <span className="flex-1 font-semibold text-slate-700">{opt}</span>
              {revealState === 'correct' && (
                <CheckCircle size={20} weight="fill" className="text-green-500 shrink-0" aria-hidden="true" />
              )}
              {revealState === 'wrong' && (
                <XCircle size={20} weight="fill" className="text-red-400 shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* Optional explanation toggle — appears after answering */}
      {answered && (
        <div className="mt-5" style={{ animation: 'fadeIn 0.35s ease-out both' }}>
          <button
            type="button"
            onClick={() => setShowExplanation((v) => !v)}
            aria-expanded={showExplanation}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl border-2 transition-all hover:brightness-95"
            style={{ borderColor: accent.light, background: accent.light, color: accent.dark }}
          >
            อธิบายเหตุผลสั้นๆ (ไม่บังคับ)
            <CaretDown
              size={12}
              weight="bold"
              className={`transition-transform duration-200 ${showExplanation ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {showExplanation && (
            <div
              className="mt-3 rounded-xl border-2 p-4 text-sm font-medium text-slate-600 leading-relaxed"
              style={{ borderColor: accent.light, background: '#fafafa', animation: 'fadeIn 0.3s ease-out both' }}
            >
              <span className="font-bold" style={{ color: isCorrect ? '#16a34a' : '#ef4444' }}>
                {isCorrect ? 'ถูกต้อง! ' : 'ยังไม่ถูก — '}
              </span>
              {question.explanation}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function LessonQuiz({
  quiz,
  accent,
  onFinish,
}: {
  quiz: QuizSet;
  accent: { base: string; dark: string; light: string };
  onFinish?: (score: { correct: number; total: number }) => void;
}) {
  const questions = quiz.questions;
  const [current, setCurrent] = useState(0);
  // Per-question chosen option; presence = answered (locked)
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));

  const isLast = current === questions.length - 1;
  const answeredCurrent = answers[current] !== null;
  const correctCount = answers.filter((a, i) => a === questions[i].answerIndex).length;
  const answeredCount = answers.filter((a) => a !== null).length;

  const select = (optionIndex: number) => {
    if (answers[current] !== null) return; // already locked
    setAnswers((prev) => prev.map((a, i) => (i === current ? optionIndex : a)));
  };

  const goNext = () => {
    if (!answeredCurrent || isLast) return;
    setCurrent((c) => c + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = () => {
    onFinish?.({ correct: correctCount, total: questions.length });
  };

  return (
    <div className="space-y-4">
      {/* Question stepper dots */}
      <div className="flex items-center justify-center gap-1.5" aria-label={`ข้อ ${current + 1} จาก ${questions.length}`}>
        {questions.map((_, i) => {
          const answered = answers[i] !== null;
          const isCurrent = i === current;
          return (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: isCurrent ? 24 : 8,
                height: 8,
                background: answered
                  ? answers[i] === questions[i].answerIndex
                    ? '#22c55e'
                    : '#f87171'
                  : isCurrent
                    ? accent.base
                    : '#e2e8f0',
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>

      <QuestionCard
        key={current}
        question={questions[current]}
        index={current}
        total={questions.length}
        accent={accent}
        selected={answers[current]}
        onSelect={select}
      />

      {/* Bottom action bar — explicit navigation, no auto-advance */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: hint / summary of progress */}
        <p className="text-xs font-semibold text-slate-400">
          ตอบแล้ว {answeredCount}/{questions.length} · ถูก {correctCount}
        </p>

        {/* Right: next question or finish */}
        {!isLast ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!answeredCurrent}
            className="btn-primary !py-2.5 !px-6 text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: accent.base }}
          >
            ข้อถัดไป
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={!answeredCurrent}
            className="inline-flex items-center gap-2 text-sm font-extrabold px-6 py-3 rounded-xl transition-all hover:brightness-105 active:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0"
            style={{ background: '#22c55e', color: '#ffffff', boxShadow: '0 4px 0 #16a34a' }}
          >
            <Check size={16} weight="bold" aria-hidden="true" />
            เสร็จสิ้น
          </button>
        )}
      </div>
    </div>
  );
}
