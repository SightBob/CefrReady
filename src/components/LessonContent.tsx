'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';
import type { LessonContent, ReviewTopic } from '@/content/units-path-lessons';
import LessonLayout from './LessonLayout';
import type { LessonStop } from './lesson-stops';
import LessonQuiz from './LessonQuiz';
import type { LessonQuizHandle, LessonQuizState } from './LessonQuiz';
import ReviewContent from './ReviewContent';
import TapSelectFlow from './TapSelectFlow';
import type { TapFlowState } from './TapSelectFlow';

export default function LessonContent({
  lesson,
  accent,
  unitTitle,
  unitNumber,
  compact,
  siblings = [],
}: {
  lesson: LessonContent;
  accent: { base: string; dark: string; light: string };
  /** Label shown in the top pill next to the unit number. */
  unitTitle: string;
  /** 1-based unit number for the pill; falls back to unitTitle when omitted. */
  unitNumber?: number;
  /** Admin preview: hide the full chrome (sidebar/bottom bar). */
  compact?: boolean;
  /** Other lessons in the same unit, for the chip dropdown. */
  siblings?: Array<{ id: number; title: string; completed?: boolean }>;
}) {
  const router = useRouter();

  // Page flow: Tab & Select (if any) -> real exam -> result.
  // The Concept Card is NOT part of the main flow anymore — learners reach it
  // through the "โหมดทบทวน" (review mode) button next to the primary action.
  const hasQuiz = Boolean(lesson.quiz?.questions?.length);
  const hasTap = Boolean(lesson.tapExercises?.some((exercise) => exercise.items.length > 0));
  const tapPage = 0;
  const quizPage = hasTap ? 1 : 0;
  const resultPage = quizPage + (hasQuiz ? 1 : 0);
  const contentPageCount = resultPage;
  const [page, setPage] = useState(0);
  // Review mode — an overlay page showing the Concept Card, outside the main
  // flow (has its own stop in the sidebar; not counted in the stats).
  const [reviewMode, setReviewMode] = useState(false);

  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  // Quiz state reported upward by LessonQuiz so the layout chrome can react.
  const quizRef = useRef<LessonQuizHandle>(null);
  const [quizState, setQuizState] = useState<LessonQuizState | null>(null);
  const handleQuizState = useCallback((state: LessonQuizState) => {
    setQuizState(state);
    if (state.finished) {
      setScore((prev) =>
        prev && prev.total === state.total ? prev : { correct: state.correctCount, total: state.total }
      );
    }
  }, []);

  // Tab & Select flow state (one-at-a-time page) — not scored yet.
  const [tapState, setTapState] = useState<TapFlowState | null>(null);
  const tapAdvanceRef = useRef<(() => void) | null>(null);
  const handleTapState = useCallback((state: TapFlowState) => {
    setTapState(state);
  }, []);

  // Record that the learner opened this node (lastVisitedAt) so the learning
  // path can offer "เรียนต่อจากเดิม". Fire-and-forget; guests get 401 and
  // everything still works via localStorage.
  useEffect(() => {
    const nodeId = Number(lesson.nodeId);
    if (!lesson.nodeId || !Number.isInteger(nodeId) || nodeId <= 0) return;
    void fetch('/api/units/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, visit: true }),
    }).catch(() => {
      // Offline/guest: ignore — completion markers remain in localStorage.
    });
  }, [lesson.nodeId]);
  const quizPassed = score !== null && score.total > 0 && score.correct === score.total;

  const recordCompletion = () => {
    if (!lesson.nodeId) return;
    window.localStorage.setItem(`units-completed-${lesson.nodeId}`, '1');
    window.dispatchEvent(new Event('units-progress-changed'));
    const nodeId = Number(lesson.nodeId);
    if (Number.isInteger(nodeId) && nodeId > 0) {
      void fetch('/api/units/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, completed: true }),
      }).catch(() => {
        // Keep the local completion when the learner is offline or a guest.
      });
    }
  };

  // ===== Sidebar stops (numbered grid) =====
  // Each numbered stop = one REAL exam question (plus Tap & Select when
  // present). "กำลังทำ" (active) always follows the question actually shown
  // on screen (quizState.activeIndex) — whether reached by clicking a number,
  // the next button, or the natural flow.
  const tapCount = hasTap ? 1 : 0;
  const questionCount = quizState?.total ?? lesson.quiz?.questions?.length ?? 0;
  const stopCount = tapCount + questionCount;
  const onQuizPage = page === quizPage && !reviewMode && page < resultPage;
  const shownQuizIndex = onQuizPage && quizState ? quizState.activeIndex : null;
  const stops: LessonStop[] = Array.from({ length: stopCount }, (_, i) => {
    if (hasTap && i === 0) {
      return { label: 'Tab & Select', state: page > tapPage ? 'done' : 'active' };
    }
    const qi = i - tapCount; // quiz question index (0-based)
    const answered = quizState?.answers?.[qi] != null;
    return {
      label: `ข้อ ${qi + 1}`,
      state: onQuizPage && shownQuizIndex === qi
        ? 'active'
        : answered || (quizState?.finished ?? false) || page > quizPage
          ? 'done'
          : 'todo',
    } as LessonStop;
  });

  // ===== Primary (yellow) action per page =====
  const tapPageActive = hasTap && page === tapPage;
  const primaryLabel = reviewMode
    ? 'ทำข้อสอบ'
    : page === resultPage
      ? lesson.nextNodeId
        ? 'บทถัดไป'
        : 'กลับหน้าหลัก'
      : page === quizPage && hasQuiz
        ? quizState?.finished
          ? 'ดูผลลัพธ์'
          : 'ตรวจคำตอบ'
      : tapPageActive
        ? 'ตรวจคำตอบ'
        : 'ต่อไป';

  const handlePrimary = () => {
    // Review mode → back to the exam exactly where the learner left off
    // (quiz/tap state lives in this component, so nothing resets).
    if (reviewMode) {
      setReviewMode(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (page === resultPage) {
      if (lesson.nextNodeId) {
        router.push(`/units/${lesson.nextNodeId}`);
      } else {
        router.push('/units');
      }
      return;
    }
    if (tapPageActive) {
      // Tab & Select: advance one prompt; when finished, move to the next page.
      if (!tapState?.finished) {
        tapAdvanceRef.current?.();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setPage((p) => Math.min(p + 1, contentPageCount));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (page === quizPage && hasQuiz) {
      if (quizState?.finished) {
        // Finish: record + go to result page
        setScore({ correct: quizState.correctCount, total: quizState.total });
        recordCompletion();
        setPage(resultPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        quizRef.current?.next();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    // Tap page → advance to the next page (quiz or result)
    setPage((p) => Math.min(p + 1, contentPageCount));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const primaryDisabled =
    !reviewMode &&
    ((page === quizPage && hasQuiz && !quizState?.finished && !quizState?.answeredCurrent) ||
      (tapPageActive && !tapState?.answeredCurrent));

  const layout = (children: React.ReactNode) => (
    <LessonLayout
      unitNumber={unitNumber ?? 0}
      title={lesson.title}
      stops={stops}
      activeStop={Math.min(
        shownQuizIndex != null ? tapCount + shownQuizIndex : tapCount + (quizState
            ? (() => {
                const firstUnanswered = quizState.answers?.findIndex((a) => a == null) ?? -1;
                return firstUnanswered === -1 ? (quizState.answers?.length ?? 1) - 1 : firstUnanswered;
              })()
            : Math.max(page - quizPage, 0)),
        Math.max(stopCount - 1, 0)
      )}
      progress={stopCount > 0 ? Math.min((quizState?.answers?.filter((a) => a != null).length ?? 0) / stopCount, 1) : 0}
      accent={accent}
      reviewMode={reviewMode}
      primaryAction={{ label: primaryLabel, onClick: handlePrimary, disabled: primaryDisabled }}
      secondaryAction={
        // Toggle: opens the Concept Card in review mode. Closing is done via
        // the primary "ทำข้อสอบ" button — no separate close button.
        !reviewMode && page < resultPage
          ? {
              label: 'โหมดทบทวน',
              onClick: () => {
                setReviewMode(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
            }
          : undefined
      }
      onStopSelect={(i) => {
        // Numbered stops map to real exam questions: clicking one leaves
        // review mode and jumps to that question via the quiz handle.
        // The highlighted number follows quizState.activeIndex automatically.
        if (reviewMode) setReviewMode(false);
        if (hasTap && i === 0) {
          setPage(tapPage);
        } else {
          const qi = i - tapCount;
          setPage(quizPage);
          quizRef.current?.goTo?.(qi);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onExit={() => router.push('/units')}
      siblings={siblings}
      currentLessonId={Number(lesson.nodeId)}
      onSiblingSelect={(id) => router.push(`/units/${id}`)}
    >
      {children}
    </LessonLayout>
  );

  // ===== Admin preview: same review rendering as the learner sees =====
  if (compact) {
    return (
      <div className="space-y-5">
        <ReviewContent
          title={lesson.title}
          topics={lesson.sections as ReviewTopic[]}
          intro={lesson.intro}
          tip={lesson.tip}
        />
      </div>
    );
  }

  return layout(
    <>
      {/* ============ PAGE 0: TAB & SELECT (one-at-a-time) ============ */}
      {!reviewMode && tapPageActive && lesson.tapExercises?.[0] && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <TapSelectFlow
            exercise={lesson.tapExercises[0]}
            tip={lesson.tip ?? null}
            accent={accent}
            onStateChange={handleTapState}
            registerAdvance={(fn) => {
              tapAdvanceRef.current = fn;
            }}
          />
        </div>
      )}

      {/* ============ REAL EXAM ============ */}
      {!reviewMode && page === quizPage && hasQuiz && lesson.quiz && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <LessonQuiz
            ref={quizRef}
            quiz={lesson.quiz}
            accent={accent}
            onStateChange={handleQuizState}
          />
        </div>
      )}

      {/* ============ REVIEW MODE: "หลังการเรียนรู้" (UI Reference) ============ */}
      {reviewMode && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <ReviewContent
            title={lesson.title}
            topics={lesson.sections as ReviewTopic[]}
            intro={lesson.intro}
            tip={lesson.tip}
          />
        </div>
      )}

      {/* ============ RESULT ============ */}
      {!reviewMode && page === resultPage && score && (
        <div className="flex flex-col items-center text-center" style={{ animation: 'fadeIn 0.4s ease-out both' }}>
          <section
            className="w-full rounded-2xl border border-slate-200/70 bg-white p-8 sm:p-10 shadow-sm"
          >
            <span
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: accent.light }}
            >
              <Trophy
                size={40}
                style={{ color: quizPassed ? accent.base : '#94a3b8' }}
                aria-hidden="true"
              />
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {quizPassed ? 'เยี่ยมมาก! ผ่านแล้ว 🎉' : 'เกือบแล้ว! ลองอีกครั้ง'}
            </h2>
            <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 leading-relaxed">
              {quizPassed
                ? `คุณตอบถูก ${score.correct}/${score.total} ข้อ — เก่งมาก! พร้อมไปบทเรียนถัดไปแล้ว`
                : `คุณตอบถูก ${score.correct}/${score.total} ข้อ — ลองทำใหม่ได้ หรือไปดูบทถัดไปก่อน`}
            </p>
            <p
              className="mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-extrabold"
              style={{ background: accent.light, color: accent.dark }}
            >
              {lesson.title}
            </p>
          </section>
        </div>
      )}

    </>
  );
}
