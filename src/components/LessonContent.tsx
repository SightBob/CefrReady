'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, ArrowLeft, ArrowRight, ArrowCounterClockwise, CheckCircle, XCircle, Lightbulb, BookOpen, Trophy, House } from '@phosphor-icons/react';
import type { LessonContent } from '@/content/units-path-lessons';
import VocabBankModal from './VocabBankModal';
import LessonQuiz from './LessonQuiz';
import RichText from './RichText';
import TapSelectExercise from './TapSelectExercise';

export default function LessonContent({
  lesson,
  accent,
}: {
  lesson: LessonContent;
  accent: { base: string; dark: string; light: string };
}) {
  const router = useRouter();
  const [vocabOpen, setVocabOpen] = useState(false);
  // Page flow: concept card (with optional inline Tap & Select) -> real exam -> result.
  const hasQuiz = Boolean(lesson.quiz?.questions?.length);
  const hasTap = Boolean(lesson.tapExercises?.some((exercise) => exercise.items.length > 0));
  const tapInline = Boolean(lesson.tapInline);
  const quizPage = hasTap && !tapInline ? 2 : 1;
  const resultPage = quizPage + (hasQuiz ? 1 : 0);
  const contentPageCount = resultPage;
  const [page, setPage] = useState(0);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const quizPassed = score !== null && score.total > 0 && score.correct === score.total;

  const goNext = () => {
    setPage((p) => Math.min(p + 1, contentPageCount));
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

  return (
    <>
      {/* Vocab bank trigger — above the lesson content */}
      {lesson.vocabBank && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setVocabOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-sm font-extrabold px-4 py-2.5 rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
            style={{ boxShadow: `0 3px 0 ${accent.base}`, color: accent.dark, border: `2px solid ${accent.light}` }}
            aria-haspopup="dialog"
          >
            <Sparkle size={16} weight="fill" style={{ color: accent.base }} aria-hidden="true" />
            คลังศัพท์ช่วยชีวิต
          </button>
        </div>
      )}

      {/* Step indicator — hidden while the quiz is showing, because LessonQuiz
          has its own per-question stepper (avoids two dot rows stacked). */}
      {contentPageCount > 1 && page < contentPageCount && (
        <div className="mb-6" aria-label={`หน้า ${page + 1} จาก ${contentPageCount}`}>
          <div className="h-2.5 rounded-full overflow-hidden bg-slate-200">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((page + 1) / contentPageCount) * 100}%`,
                background: accent.base,
              }}
            />
          </div>
          <p className="mt-2 text-center text-xs font-bold text-slate-400">
            {page === 0 ? 'Concept Card' : page === quizPage ? 'Real Exam' : 'Tap & Select'}
          </p>
        </div>
      )}

      {/* ============ PAGE 0: EXPLANATION ============ */}
      {page === 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          {/* หัวข้อเล็ก "จำไว้เลย" + คำอธิบายสั้น ๆ — แสดงเฉพาะเมื่อมีเนื้อหา */}
          {lesson.intro?.trim() && (
            <section
              className="rounded-2xl border-2 p-5 sm:p-6 mb-6"
              style={{ borderColor: accent.light, background: accent.light }}
            >
              <p
                className="text-xs font-extrabold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: accent.dark }}
              >
                <BookOpen size={14} weight="fill" aria-hidden="true" />
                จำไว้เลย
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
                className="bg-white rounded-2xl border-2 border-slate-100 p-5 sm:p-6 shadow-sm"
              >
                <h2 className="text-lg font-extrabold mb-2" style={{ color: accent.dark }}>
                  <RichText text={section.heading} highlightColor={accent.light} as="span" />
                </h2>
                <RichText
                  text={section.body}
                  highlightColor={accent.light}
                  className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4"
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
                      ตัวอย่างประโยคที่ถูกต้อง
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
                            <CheckCircle
                              size={20}
                              weight="fill"
                              className="text-emerald-500 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <XCircle
                              size={20}
                              weight="fill"
                              className="text-rose-400 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
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

          {/* Tap & Select — inline practice for lessons that keep explanation and practice together */}
          {hasTap && tapInline && (
            <div className="mt-7 space-y-5">
              {lesson.tapExercises?.map((exercise, index) => (
                <TapSelectExercise key={`${exercise.title}-${index}`} exercise={exercise} accent={accent} />
              ))}
            </div>
          )}

          {/* Tip box */}
          {lesson.tip && (
            <aside
              className="mt-6 rounded-2xl border-2 p-5 flex items-start gap-3"
              style={{ borderColor: accent.light, background: '#fafafa' }}
            >
              <Lightbulb
                size={24}
                weight="fill"
                className="shrink-0 mt-0.5"
                style={{ color: accent.dark }}
                aria-hidden="true"
              />
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: accent.dark }}
                >
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
        </div>
      )}

      {/* ============ PAGE 1: TAP & SELECT ============ */}
      {page === 1 && hasTap && !tapInline && (
        <div className="space-y-5" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          {lesson.tapExercises?.map((exercise, index) => (
            <TapSelectExercise key={`${exercise.title}-${index}`} exercise={exercise} accent={accent} />
          ))}
        </div>
      )}

      {/* ============ REAL EXAM ============ */}
      {page === quizPage && hasQuiz && lesson.quiz && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <LessonQuiz
            key={`quiz-attempt-${score === null ? 'fresh' : 'done'}`}
            quiz={lesson.quiz}
            accent={accent}
            onFinish={(s) => {
              setScore(s);
              if (lesson.nodeId && s.total > 0 && s.correct === s.total) {
                const nodeId = Number(lesson.nodeId);
                window.localStorage.setItem(`units-completed-${lesson.nodeId}`, '1');
                window.dispatchEvent(new Event('units-progress-changed'));
                if (Number.isInteger(nodeId) && nodeId > 0) {
                  void fetch('/api/units/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nodeId, completed: true }),
                  }).catch(() => {
                    // Keep the local completion when the learner is offline or a guest.
                  });
                }
              }
              setPage(resultPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* ============ PAGE 2: RESULT ============ */}
      {page === resultPage && score && (
        <div
          className="flex flex-col items-center text-center"
          style={{ animation: 'fadeIn 0.4s ease-out both' }}
        >
          <section
            className="w-full rounded-2xl border-2 p-8 sm:p-10"
            style={{ borderColor: accent.light, background: '#ffffff', boxShadow: '0 4px 0 rgba(0,0,0,0.06)' }}
          >
            <span
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: accent.light }}
            >
              <Trophy
                size={40}
                weight="fill"
                style={{ color: quizPassed ? accent.base : '#94a3b8' }}
                aria-hidden="true"
              />
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {quizPassed ? 'เยี่ยมมาก! ผ่านแล้ว 🎉' : 'เกือบแล้ว! ลองอีกครั้ง'}
            </h2>
            <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 leading-relaxed">
              {quizPassed
                ? 'คุณตอบถูกครบทุกข้อ — เก่งมาก! พร้อมไปบทเรียนถัดไปแล้ว'
                : 'ยังไม่เป็นไรนะ ลองทำข้อสอบใหม่ได้ หรือไปดูบทถัดไปก่อนก็ได้'}
            </p>
            <p
              className="mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-extrabold"
              style={{ background: accent.light, color: accent.dark }}
            >
              {lesson.title}
            </p>

            {/* Result actions: the next lesson is the primary action; navigation stays grouped below. */}
            <div className="mt-8 space-y-3">
              {lesson.nextNodeId && (
                <button
                  type="button"
                  onClick={() => router.push(`/units/${lesson.nextNodeId}`)}
                  className="group w-full flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: accent.base, color: '#ffffff', boxShadow: `0 4px 0 ${accent.dark}` }}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <ArrowRight size={21} weight="bold" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-white/75">บทถัดไป</span>
                      <span className="block text-base font-extrabold truncate">บทถัดไป</span>
                    </span>
                  </span>
                  <ArrowRight size={21} weight="bold" className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPage(quizPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ borderColor: accent.light, background: accent.light, color: accent.dark }}
                >
                  <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
                  ทำข้อสอบใหม่
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/units')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ borderColor: accent.light, background: '#ffffff', color: accent.dark }}
                >
                  <House size={16} weight="fill" aria-hidden="true" />
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ============ NAVIGATION ============ */}
      {page < resultPage && (

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            className="btn-secondary !py-2.5 !px-5 text-sm inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            {page === 0 ? 'กลับไปเส้นทาง' : 'ย้อนกลับ'}
          </button>

          {page < resultPage - 1 && (
            <button
              type="button"
              onClick={goNext}
              className="btn-primary !py-2.5 !px-6 text-sm inline-flex items-center gap-2"
              style={{ background: accent.base }}
            >
              {page === 0 && hasTap && !tapInline ? 'อ่านจบแล้ว ไปฝึกกัน' : page === 0 ? 'เข้าใจแล้ว ไปทำข้อสอบ' : 'ไปทำ Real Exam'}
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          {page === resultPage - 1 && !hasQuiz && (
            <button
              type="button"
              onClick={() => setPage(resultPage)}
              className="btn-primary !py-2.5 !px-6 text-sm inline-flex items-center gap-2"
              style={{ background: accent.base }}
            >
              เสร็จสิ้น
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          {page === resultPage - 1 && (
            <span className="text-xs text-slate-400 font-semibold">{hasQuiz ? '' : 'จบบทเรียนนี้แล้ว 🎉'}</span>
          )}
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
