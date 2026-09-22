'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkle,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Lightbulb,
  BookOpen,
  Trophy,
  House,
} from 'lucide-react';
import type { LessonContent, HeadingSize, BodySize } from '@/content/units-path-lessons';
import LessonLayout from './LessonLayout';
import type { LessonStop } from './lesson-stops';
import VocabBankModal from './VocabBankModal';
import LessonQuiz from './LessonQuiz';
import type { LessonQuizHandle, LessonQuizState } from './LessonQuiz';
import RichText from './RichText';
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
  const [vocabOpen, setVocabOpen] = useState(false);

  // Per-section font-size classes (chosen in the Admin editor)
  const HEADING_CLASS: Record<HeadingSize, string> = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl',
  };
  const BODY_CLASS: Record<BodySize, string> = {
    sm: 'text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
  };
  // Page flow: concept card -> Tab & Select (if any) -> real exam -> result.
  const hasQuiz = Boolean(lesson.quiz?.questions?.length);
  const hasTap = Boolean(lesson.tapExercises?.some((exercise) => exercise.items.length > 0));
  const tapPage = 1;
  const quizPage = hasTap ? 2 : 1;
  const resultPage = quizPage + (hasQuiz ? 1 : 0);
  const contentPageCount = resultPage;
  const [page, setPage] = useState(0);
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

  const restart = () => {
    setScore(null);
    setQuizState(null);
    setPage(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (page === 0) {
      router.push('/units');
      return;
    }
    setPage((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===== Sidebar stops (numbered grid) =====
  const stopLabels: string[] = ['Concept Card'];
  if (hasTap) stopLabels.push('Tab & Select');
  if (hasQuiz) stopLabels.push('Real Exam');
  stopLabels.push('สรุปผล');
  const stops: LessonStop[] = stopLabels.map((label, i) => ({
    label,
    state: i < page ? 'done' : i === page ? 'active' : 'todo',
  }));

  // ===== Bottom bar stats =====
  // The mockup counts each stop as one "point": correct = stops finished,
  // total = all stops (result page included once the quiz is done).
  const statsTotal = stops.length;
  const statsCorrect = page >= resultPage && score ? score.correct : page; // stops finished so far

  // ===== Primary (yellow) action per page =====
  const tapPageActive = hasTap && page === tapPage;
  const primaryLabel =
    page === resultPage
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
    // Concept / Tap pages → advance one page
    setPage((p) => Math.min(p + 1, contentPageCount));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const primaryDisabled =
    (page === quizPage && hasQuiz && !quizState?.finished && !quizState?.answeredCurrent) ||
    (tapPageActive && !tapState?.answeredCurrent);

  // Concept bullets for the green summary card (max 3)
  const summaryBullets: string[] = [];
  if (lesson.intro?.trim()) {
    // Strip RichText markup for a plain-text bullet
    summaryBullets.push(lesson.intro.replace(/[*_`#]/g, '').slice(0, 80));
  }
  for (const section of lesson.sections) {
    if (summaryBullets.length >= 3) break;
    summaryBullets.push(section.body.replace(/[*_`#]/g, '').slice(0, 80));
  }
  if (lesson.tip && summaryBullets.length < 3) {
    summaryBullets.push(lesson.tip.replace(/[*_`#]/g, '').slice(0, 80));
  }

  const layout = (children: React.ReactNode) => (
    <LessonLayout
      unitNumber={unitNumber ?? 0}
      title={lesson.title}
      stops={stops}
      activeStop={Math.min(page, stops.length - 1)}
      progress={contentPageCount > 0 ? page / contentPageCount : 0}
      accent={accent}
      summary={{
        title: lesson.sections[0]?.heading?.replace(/[*_`#]/g, '').slice(0, 40) || 'สรุปในส่วนนี้',
        bullets: summaryBullets.length > 0 ? summaryBullets : ['เนื้อหาในบทนี้'],
      }}
      primaryAction={{ label: primaryLabel, onClick: handlePrimary, disabled: primaryDisabled }}
      onBack={goBack}
      stats={{ correct: statsCorrect, total: statsTotal }}
      onRestart={restart}
      onStopSelect={(i) => {
        setPage(Math.min(i, contentPageCount));
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

  // ===== Admin preview: keep the old simple chrome without the sidebar =====
  if (compact) {
    return (
      <div className="space-y-5">
        {lesson.vocabBank && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setVocabOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-sm font-extrabold px-4 py-2.5 rounded-xl"
              style={{ boxShadow: `0 3px 0 ${accent.base}`, color: accent.dark, border: `2px solid ${accent.light}` }}
              aria-haspopup="dialog"
            >
              <Sparkle size={16} style={{ color: accent.base }} aria-hidden="true" />
              คลังศัพท์ช่วยชีวิต
            </button>
          </div>
        )}
        <ConceptSections
          lesson={lesson}
          accent={accent}
          headingClass={HEADING_CLASS}
          bodyClass={BODY_CLASS}
        />
        {vocabOpen && lesson.vocabBank && (
          <VocabBankModal
            bank={lesson.vocabBank}
            accent={{ base: accent.base, light: accent.light }}
            onClose={() => setVocabOpen(false)}
          />
        )}
      </div>
    );
  }

  return layout(
    <>
      {/* Concept / quiz / result content */}
      {page < resultPage && (
        <div className="flex justify-end mb-4">
          {lesson.vocabBank && (
            <button
              type="button"
              onClick={() => setVocabOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-sm font-extrabold px-4 py-2.5 rounded-full"
              style={{ boxShadow: `0 3px 0 ${accent.base}`, color: accent.dark, border: `2px solid ${accent.light}` }}
              aria-haspopup="dialog"
            >
              <Sparkle size={16} style={{ color: accent.base }} aria-hidden="true" />
              คลังศัพท์ช่วยชีวิต
            </button>
          )}
        </div>
      )}

      {/* ============ PAGE 0: EXPLANATION ============ */}
      {page === 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <ConceptSections lesson={lesson} accent={accent} headingClass={HEADING_CLASS} bodyClass={BODY_CLASS} />
        </div>
      )}

      {/* ============ PAGE 1: TAB & SELECT (one-at-a-time) ============ */}
      {tapPageActive && lesson.tapExercises?.[0] && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <TapSelectFlow
            key={`tap-attempt-${score === null ? 'fresh' : 'done'}`}
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
      {page === quizPage && hasQuiz && lesson.quiz && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <LessonQuiz
            ref={quizRef}
            key={`quiz-attempt-${score === null ? 'fresh' : 'done'}`}
            quiz={lesson.quiz}
            accent={accent}
            onStateChange={handleQuizState}
          />
        </div>
      )}

      {/* ============ RESULT ============ */}
      {page === resultPage && score && (
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

      {/* Modal */}
      {vocabOpen && lesson.vocabBank && (
        <VocabBankModal
          bank={lesson.vocabBank}
          accent={{ base: accent.base, light: accent.light }}
          onClose={() => setVocabOpen(false)}
        />
      )}
    </>
  );
}

/** Shared concept sections (intro, boxes, tables, examples, tip). */
function ConceptSections({
  lesson,
  accent,
  headingClass,
  bodyClass,
}: {
  lesson: LessonContent;
  accent: { base: string; dark: string; light: string };
  headingClass: Record<HeadingSize, string>;
  bodyClass: Record<BodySize, string>;
}) {
  return (
    <>
      {/* จำไว้เลย box */}
      {lesson.intro?.trim() && (
        <section
          className="rounded-2xl border-2 p-5 sm:p-6 mb-6 bg-white"
          style={{ borderColor: accent.light, background: accent.light }}
        >
          <p
            className="text-xs font-extrabold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: accent.dark }}
          >
            <BookOpen size={14} aria-hidden="true" />
            คำนะสำหรับบทนี้
          </p>
          <RichText
            text={lesson.intro}
            highlightColor={accent.light}
            className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed"
          />
        </section>
      )}

      {/* Lesson boxes */}
      <div className="space-y-6">
        {lesson.sections.map((section) => (
          <section
            key={section.heading}
            className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-sm"
          >
            <h2 className={`${headingClass[section.headingSize ?? 'md']} font-extrabold mb-2 leading-snug`} style={{ color: accent.dark }}>
              <RichText text={section.heading} highlightColor={accent.light} as="span" />
            </h2>
            <RichText
              text={section.body}
              highlightColor={accent.light}
              className={`${bodyClass[section.bodySize ?? 'md']} text-slate-600 leading-relaxed mb-4`}
            />

            {section.table && section.table.rows.length > 0 && (
              <div className="mb-4 overflow-x-auto rounded-xl border-2" style={{ borderColor: accent.light }}>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {section.table.headers.map((h, hi) => (
                        <th
                          key={hi}
                          className="text-left font-extrabold px-3.5 py-2.5 text-white text-xs uppercase tracking-wider first:rounded-tl-xl last:rounded-tr-xl"
                          style={{ background: accent.base }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={`px-3.5 py-2.5 align-top ${
                              ci === 0 ? 'font-bold text-slate-700' : 'text-slate-600'
                            } ${ri === section.table!.rows.length - 1 ? (ci === 0 ? 'rounded-bl-xl' : '') && (ci === row.length - 1 ? 'rounded-br-xl' : '') : ''}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.examples && (
              <>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                  เลือกคำที่เป็นประโยคได้ถูกต้อง
                </p>
                <ul className="space-y-2.5">
                  {section.examples.map((ex, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 rounded-xl px-4 py-3 border-2 ${
                        ex.ok
                          ? 'bg-emerald-50 border-emerald-100'
                          : 'bg-rose-50 border-rose-100'
                      }`}
                    >
                      {ex.ok ? (
                        <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <XCircle size={20} className="text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`font-semibold text-sm sm:text-base ${
                            ex.ok
                              ? 'text-slate-800'
                              : 'text-slate-500 line-through decoration-rose-300'
                          }`}
                        >
                          {ex.en}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{ex.th}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>

      {/* Tip box */}
      {lesson.tip && (
        <aside
          className="mt-6 rounded-2xl border-2 p-5 flex items-start gap-3"
          style={{ borderColor: accent.light, background: '#fafafa' }}
        >
          <Lightbulb size={24} className="shrink-0 mt-0.5" style={{ color: accent.dark }} aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accent.dark }}>
              เคล็ดลับ
            </p>
            <RichText
              text={lesson.tip}
              highlightColor={accent.light}
              className="text-sm sm:text-base font-semibold text-slate-700 mt-1"
            />
          </div>
        </aside>
      )}
    </>
  );
}
