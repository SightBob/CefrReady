'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { CheckCircle, XCircle, CaretDown } from '@phosphor-icons/react';
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

export interface LessonQuizState {
  /** Chosen option per question from the FIRST attempt (null = unanswered). */
  answers: (number | null)[];
  /** First-attempt correct count so far. */
  correctCount: number;
  total: number;
  /** Whether the quiz is fully done (all first-pass + retry rounds cleared). */
  finished: boolean;
  /** Whether the question currently on screen has been answered. */
  answeredCurrent: boolean;
  /** True while the retry round is running. */
  inRetry: boolean;
  retryPos: number;
  retryTotal: number;
  /** In the retry round: whether the current retry attempt was wrong. */
  retryCurrentWrong: boolean;
}

export interface LessonQuizHandle {
  /** Pick an option for the active question (ignored when already answered). */
  select: (optionIndex: number) => void;
  /** Advance: next first-pass question or next retry item. */
  next: () => void;
  /** Retry the current wrong retry-question (clears the wrong attempt). */
  retryCurrent: () => void;
  /** Leave the retry round early. */
  exitRetry: () => void;
}

function QuestionCard({
  question,
  accent,
  selected,
  onSelect,
  isRetry,
}: {
  question: QuizQuestion;
  accent: { base: string; dark: string; light: string };
  selected: number | null;
  onSelect: (optionIndex: number) => void;
  isRetry?: boolean;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const answered = selected !== null;
  const isCorrect = selected === question.answerIndex;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 sm:p-7">
      {isRetry && (
        <div className="mb-4">
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 align-middle">
            ทำซ้ำข้อที่ผิด
          </span>
        </div>
      )}

      {/* Fill-in sentence */}
      <p className="text-base sm:text-xl font-semibold text-slate-800 mb-6 leading-relaxed">
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

      {/* Options — full-width rows like the mockup */}
      <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="ตัวเลือกคำตอบ">
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
              className={`flex items-center gap-3 rounded-2xl border px-4 sm:px-5 py-4 text-left transition-all duration-150 ${
                revealState === 'dim' ? 'opacity-45' : ''
              } ${
                revealState === 'selected' && !answered
                  ? 'bg-[#F1F2F4] cursor-pointer'
                  : revealState === 'idle'
                    ? 'bg-white border-slate-200/80 hover:bg-slate-50 cursor-pointer'
                    : 'bg-white border-transparent cursor-default'
              }`}
              style={{
                borderColor:
                  revealState === 'correct'
                    ? '#22c55e'
                    : revealState === 'wrong'
                      ? '#f87171'
                      : revealState === 'selected' && !answered
                        ? accent.base
                        : undefined,
                background:
                  revealState === 'correct'
                    ? '#f0fdf4'
                    : revealState === 'wrong'
                      ? '#fef2f2'
                      : undefined,
                boxShadow:
                  revealState === 'correct'
                    ? '0 2px 0 #bbf7d0'
                    : revealState === 'wrong'
                      ? '0 2px 0 #fecaca'
                      : undefined,
              }}
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  revealState === 'correct'
                    ? 'bg-emerald-500 text-white'
                    : revealState === 'wrong'
                      ? 'bg-red-400 text-white'
                      : revealState === 'selected'
                        ? 'bg-slate-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                }`}
                aria-hidden="true"
              >
                {LETTERS[i]}
              </span>
              <span className="flex-1 font-medium text-[1rem] text-slate-800">{opt}</span>
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
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 transition-all hover:brightness-95"
          >
            ดูคำอธิบาย
            <CaretDown
              size={12}
              weight="bold"
              className={`transition-transform duration-200 ${showExplanation ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {showExplanation && (
            <div
              className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm font-medium text-slate-600 leading-relaxed"
              style={{ animation: 'fadeIn 0.3s ease-out both' }}
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
 *
 * The parent layout (LessonContent) drives navigation through the imperative
 * handle and receives state updates through onStateChange.
 */
const LessonQuiz = forwardRef<LessonQuizHandle, {
  quiz: QuizSet;
  accent: { base: string; dark: string; light: string };
  onStateChange?: (state: LessonQuizState) => void;
}>(function LessonQuiz({ quiz, accent, onStateChange }, ref) {
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
  const retryDone = inRetry && retryAnswer !== null && retryPos === retryQueue!.length - 1;
  const retryCurrentWrong = inRetry && retryAnswer !== null && retryAnswer !== questions[retryQueue![retryPos]].answerIndex;
  const finished = firstPassFinished && (wrongIndices.length === 0 || (inRetry && retryDone && !retryCurrentWrong));

  const select = (optionIndex: number) => {
    if (answeredCurrent) return;
    if (inRetry) {
      setRetryAnswer(optionIndex);
    } else {
      setAnswers((prev) => prev.map((a, i) => (i === activeIndex ? optionIndex : a)));
    }
  };

  const goNext = () => {
    if (!answeredCurrent) return;
    if (inRetry) {
      if (retryPos < retryQueue!.length - 1) {
        setRetryAnswer(null);
        setRetryPos((p) => p + 1);
      }
      return;
    }
    if (!isLastFirstPass) {
      setCurrent((c) => c + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-retry: when the first pass completes with wrong answers, enter the
  // retry round immediately (no button press needed).
  React.useEffect(() => {
    if (!inRetry && firstPassFinished && wrongIndices.length > 0 && retryQueue === null && !retryScheduled.current) {
      retryScheduled.current = true;
      setRetryQueue(wrongIndices);
      setRetryPos(0);
    }
  }, [inRetry, firstPassFinished, wrongIndices, retryQueue]);

  useImperativeHandle(ref, () => ({
    select,
    next: goNext,
    retryCurrent: () => {
      if (inRetry) setRetryAnswer(null);
    },
    exitRetry: () => {
      setRetryQueue(null);
      setRetryPos(0);
      setRetryAnswer(null);
    },
  }));

  // Report state upward so the parent layout can drive its chrome.
  React.useEffect(() => {
    onStateChange?.({
      answers,
      correctCount,
      total: questions.length,
      finished,
      answeredCurrent,
      inRetry,
      retryPos,
      retryTotal: retryQueue?.length ?? 0,
      retryCurrentWrong,
    });
  }, [answers, correctCount, questions.length, finished, answeredCurrent, inRetry, retryPos, retryQueue, retryCurrentWrong, onStateChange]);

  const activeQuestion = questions[activeIndex];
  if (!activeQuestion) return null;

  return (
    <div className="space-y-4">
      {/* Retry round banner */}
      {inRetry && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
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
        key={inRetry ? `retry-${activeIndex}-${retryPos}` : `first-${activeIndex}`}
        question={activeQuestion}
        accent={accent}
        selected={inRetry ? retryAnswer : answers[activeIndex]}
        onSelect={select}
        isRetry={inRetry}
      />
    </div>
  );
});

export default LessonQuiz;
