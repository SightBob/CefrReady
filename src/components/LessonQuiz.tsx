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
  /** Chosen option per question (null = unanswered). */
  answers: (number | null)[];
  /** Correct count so far. */
  correctCount: number;
  total: number;
  /** Whether the quiz is fully done (all questions answered). */
  finished: boolean;
  /** Whether the question currently on screen has been answered. */
  answeredCurrent: boolean;
  /** Index of the question currently on screen (0-based). */
  activeIndex: number;
}

export interface LessonQuizHandle {
  /** Pick an option for the active question (ignored when already answered). */
  select: (optionIndex: number) => void;
  /** Advance: next question. */
  next: () => void;
  /** Jump to a specific question index. */
  goTo?: (index: number) => void;
}

function QuestionCard({
  question,
  accent,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  accent: { base: string; dark: string; light: string };
  selected: number | null;
  onSelect: (optionIndex: number) => void;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const answered = selected !== null;
  const isCorrect = selected === question.answerIndex;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 sm:p-7">

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
 * Quiz flow: answer every question once. Wrong answers are revealed and the
 * learner simply moves on — there is NO retry round. The reported score =
 * correct count.
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
  // Chosen option per question (null = not yet answered)
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  // Cursor
  const [current, setCurrent] = useState(0);

  const correctCount = answers.filter((a, i) => a === questions[i].answerIndex).length;

  const activeIndex = Math.min(current, questions.length - 1);
  const answeredCurrent = answers[activeIndex] !== null;
  const isLastQuestion = current === questions.length - 1;
  const finished = answers.every((a) => a !== null);

  const select = (optionIndex: number) => {
    if (answeredCurrent) return;
    setAnswers((prev) => prev.map((a, i) => (i === activeIndex ? optionIndex : a)));
  };

  const goNext = () => {
    if (!answeredCurrent) return;
    if (!isLastQuestion) {
      setCurrent((c) => c + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useImperativeHandle(ref, () => ({
    select,
    next: goNext,
    // Jump to a specific question.
    goTo: (index: number) => {
      setCurrent(Math.max(0, Math.min(index, questions.length - 1)));
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
      activeIndex,
    });
  }, [answers, correctCount, questions.length, finished, answeredCurrent, activeIndex, onStateChange]);

  const activeQuestion = questions[activeIndex];
  if (!activeQuestion) return null;

  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{ background: '#F5FBFF', borderColor: '#DBEAF5' }}
    >
      {/* Practice header — green title + question pagination (UI Reference) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-extrabold" style={{ color: '#22A45D' }}>
          ตอบคำถามเกี่ยวกับความหมายของประโยค
        </h3>
        
      </div>

      <QuestionCard
        key={`q-${activeIndex}`}
        question={activeQuestion}
        accent={accent}
        selected={answers[activeIndex]}
        onSelect={select}
      />
    </section>
  );
});

export default LessonQuiz;
