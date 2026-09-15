'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, CaretDown, ArrowRight, ArrowCounterClockwise, Check } from '@phosphor-icons/react';
// (ArrowCounterClockwise still used by the ลองข้อนี้อีกครั้ง button in retry)
import type { QuizSet, QuizQuestion } from '@/content/units-path-lessons';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function shuffleQuizQuestion(question: QuizQuestion, previousAnswerIndex: number | null): QuizQuestion {
  const options = question.options.map((label, index) => ({ label, index }));
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Re-shuffle a few times when possible so adjacent questions do not expose
  // the correct answer in the same position. The answer index always follows
  // the original option index.
  if (options.length > 1 && options.findIndex((option) => option.index === question.answerIndex) === previousAnswerIndex) {
    const correctPosition = options.findIndex((option) => option.index === question.answerIndex);
    const swapPosition = correctPosition === 0 ? 1 : 0;
    [options[correctPosition], options[swapPosition]] = [options[swapPosition], options[correctPosition]];
  }

  return {
    ...question,
    options: options.map((option) => option.label),
    answerIndex: options.findIndex((option) => option.index === question.answerIndex),
  };
}

function shuffleQuizQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  let previousAnswerIndex: number | null = null;
  return questions.map((question) => {
    const shuffled = shuffleQuizQuestion(question, previousAnswerIndex);
    previousAnswerIndex = shuffled.answerIndex;
    return shuffled;
  });
}

function QuestionCard({
  question,
  index,
  total,
  accent,
  selected,
  onSelect,
  isRetry,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  accent: { base: string; dark: string; light: string };
  selected: number | null;
  onSelect: (optionIndex: number) => void;
  isRetry?: boolean;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const answered = selected !== null;
  const isCorrect = selected === question.answerIndex;

  return (
    <section className="bg-white rounded-2xl border-2 border-slate-100 p-5 sm:p-6 shadow-sm">
      {/* Progress chip — no question numbering shown */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold" style={{ color: accent.dark }}>
          {isRetry && (
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 align-middle">
              ทำซ้ำข้อที่ผิด
            </span>
          )}
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

/**
 * Quiz flow: answer every question once, then any wrong answers are re-served
 * in a retry round (original order). Rounds repeat until everything is
 * correct; the reported score = first-attempt correct count.
 */
export default function LessonQuiz({
  quiz,
  accent,
  onFinish,
}: {
  quiz: QuizSet;
  accent: { base: string; dark: string; light: string };
  onFinish?: (score: { correct: number; total: number }) => void;
}) {
  const sourceQuestions = quiz.questions;
  // Keep the first render deterministic for SSR/hydration, then shuffle in
  // the browser so every exam mount gets a fresh option order.
  const [questions, setQuestions] = useState<QuizQuestion[]>(sourceQuestions);
  React.useEffect(() => {
    setQuestions(shuffleQuizQuestions(sourceQuestions));
  }, [sourceQuestions]);
  // Chosen option per question from the FIRST attempt (null = not yet answered)
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  // First-pass cursor
  const [current, setCurrent] = useState(0);
  // Retry round: subset of question indices answered wrong, in original order.
  // null = no retry round active (still in the first pass).
  const [retryQueue, setRetryQueue] = useState<number[] | null>(null);
  const [retryPos, setRetryPos] = useState(0);
  // Chosen option in the CURRENT retry attempt (reset per retry question)
  const [retryAnswer, setRetryAnswer] = useState<number | null>(null);
  // Guards the auto-retry effect from firing more than once per pass
  const retryScheduled = React.useRef(false);

  const inRetry = retryQueue !== null;

  const correctCount = answers.filter((a, i) => a === questions[i].answerIndex).length;
  const wrongIndices = answers
    .map((a, i) => (a !== null && a !== questions[i].answerIndex ? i : -1))
    .filter((i) => i !== -1);

  const firstPassFinished = answers.every((a) => a !== null);
  const activeIndex = inRetry ? retryQueue![retryPos] : Math.min(current, questions.length - 1);
  const answeredCurrent = inRetry ? retryAnswer !== null : answers[activeIndex] !== null;
  const isLastFirstPass = current === questions.length - 1;

  const select = (optionIndex: number) => {
    if (answeredCurrent) return;
    if (inRetry) {
      setRetryAnswer(optionIndex);
    } else {
      setAnswers((prev) => prev.map((a, i) => (i === activeIndex ? optionIndex : a)));
    }
  };

  const goNext = () => {
    if (!answeredCurrent || inRetry || isLastFirstPass) return;
    setCurrent((c) => c + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-retry: when the first pass completes with wrong answers, enter the
  // retry round immediately (no button press needed). Wrong questions are
  // appended right after the current position — the learner just keeps
  // pressing ข้อถัดไป and the retry questions flow in seamlessly.
  React.useEffect(() => {
    if (!inRetry && firstPassFinished && wrongIndices.length > 0 && retryQueue === null && !retryScheduled.current) {
      retryScheduled.current = true;
      setRetryQueue(wrongIndices);
      setRetryPos(0);
    }
  }, [inRetry, firstPassFinished, wrongIndices, retryQueue]);

  const finish = () => {
    onFinish?.({ correct: correctCount, total: questions.length });
  };

  const retryDone = inRetry && retryAnswer !== null && retryPos === retryQueue!.length - 1;
  const retryCurrentWrong = inRetry && retryAnswer !== null && retryAnswer !== questions[retryQueue![retryPos]].answerIndex;

  return (
    <div className="space-y-4">
      {/* Retry round banner */}
      {inRetry && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-amber-800">
            รอบทบทวน — ลองทำข้อที่ผิดอีกครั้ง ({retryPos + 1}/{retryQueue!.length})
          </p>
          <button
            type="button"
            onClick={() => {
              setRetryQueue(null);
              setRetryPos(0);
              setRetryAnswer(null);
            }}
            className="text-xs font-bold text-amber-700 hover:underline shrink-0"
          >
            ออกจากรอบทบทวน
          </button>
        </div>
      )}

      <QuestionCard
        key={inRetry ? `retry-${activeIndex}` : `first-${activeIndex}`}
        question={questions[activeIndex]}
        index={activeIndex}
        total={questions.length}
        accent={accent}
        selected={inRetry ? retryAnswer : answers[activeIndex]}
        onSelect={select}
        isRetry={inRetry}
      />

      {/* Bottom action bar — explicit navigation, no auto-advance */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: hint / summary of progress */}
        <p className="text-xs font-semibold text-slate-400">
          ถูก {correctCount} ข้อ
        </p>

        {/* Right: context-sensitive action */}
        {inRetry ? (
          retryDone ? (
            retryCurrentWrong ? (
              <button
                type="button"
                onClick={() => setRetryAnswer(null)}
                className="inline-flex items-center gap-2 text-sm font-extrabold px-6 py-3 rounded-xl transition-all hover:brightness-105"
                style={{ background: accent.base, color: '#ffffff', boxShadow: `0 4px 0 ${accent.dark}` }}
              >
                <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
                ลองข้อนี้อีกครั้ง
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-2 text-sm font-extrabold px-6 py-3 rounded-xl transition-all hover:brightness-105 active:translate-y-[2px]"
                style={{ background: '#22c55e', color: '#ffffff', boxShadow: '0 4px 0 #16a34a' }}
              >
                <Check size={16} weight="bold" aria-hidden="true" />
                เสร็จสิ้น
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                if (retryAnswer === null) return;
                setRetryAnswer(null);
                setRetryPos((p) => p + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={retryAnswer === null}
              className="btn-primary !py-2.5 !px-6 text-sm inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: accent.base }}
            >
              ข้อถัดไป
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          )
        ) : isLastFirstPass ? (
          // Last first-pass question answered — the auto-retry effect enters
          // the retry round instantly; show เสร็จสิ้น only when all correct.
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
        ) : (
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
        )}
      </div>
    </div>
  );
}
