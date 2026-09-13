'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, ArrowLeft, ArrowRight, CheckCircle, XCircle, Lightbulb, BookOpen, Trophy, House } from '@phosphor-icons/react';
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
  // Page flow: page 0 = explanation, page 1 = quiz (if present), page 2 = result.
  // The result page appears ONLY when the learner presses เสร็จสิ้น on the quiz.
  const hasQuiz = Boolean(lesson.quiz);
  const totalPages = hasQuiz ? 2 : 1;
  const [page, setPage] = useState(0);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const quizPassed = score !== null && score.total > 0 && score.correct === score.total;

  const goNext = () => {
    setPage((p) => Math.min(p + 1, totalPages - 1));
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
      {totalPages > 1 && page === 0 && (
        <div className="mb-6 flex items-center justify-center gap-2" aria-label={`หน้า ${page + 1} จาก ${totalPages}`}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === page ? 28 : 8,
                background: i === page ? accent.base : '#e2e8f0',
              }}
              aria-hidden="true"
            />
          ))}
          <span className="ml-2 text-xs font-bold text-slate-400">
            {page === 0 ? 'คำอธิบาย' : 'แบบฝึกหัด'}
          </span>
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

                {section.tap && section.tap.items.length > 0 && (
                  <div className="mt-4">
                    <TapSelectExercise exercise={section.tap} accent={accent} />
                  </div>
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

      {/* ============ PAGE 2: RESULT ============ */}
      {page === 2 && score && (
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
                ? `คุณตอบถูกทั้งหมด ${score.correct}/${score.total} ข้อ — เก่งมาก!`
                : `คุณตอบถูก ${score.correct}/${score.total} ข้อ — ลองกลับไปอ่านคำอธิบายแล้วทำใหม่อีกครั้งนะ`}
            </p>              <p
              className="mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-extrabold"
              style={{ background: accent.light, color: accent.dark }}
            >
              {lesson.title} · {score.correct}/{score.total} คะแนน
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold px-5 py-3 rounded-xl border-2 transition-all hover:brightness-95"
                style={{ borderColor: accent.light, background: accent.light, color: accent.dark }}
              >
                <ArrowLeft size={16} weight="bold" aria-hidden="true" />
                ทำข้อสอบใหม่
              </button>
              {quizPassed && lesson.nextNodeId && (
                <button
                  type="button"
                  onClick={() => router.push(`/units/${lesson.nextNodeId}`)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-extrabold px-6 py-3 rounded-xl transition-all hover:brightness-105 active:translate-y-[2px]"
                  style={{ background: accent.base, color: '#ffffff', boxShadow: `0 4px 0 ${accent.dark}` }}
                >
                  บทถัดไป
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/units')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-extrabold px-6 py-3 rounded-xl transition-all hover:brightness-105 active:translate-y-[2px]"
                style={{ background: quizPassed ? '#ffffff' : accent.base, color: quizPassed ? accent.dark : '#ffffff', border: quizPassed ? `2px solid ${accent.light}` : undefined, boxShadow: quizPassed ? undefined : `0 4px 0 ${accent.dark}` }}
              >
                <House size={16} weight="fill" aria-hidden="true" />
                กลับไปหน้าหลัก
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ============ PAGE 1: QUIZ ============ */}
      {page === 1 && lesson.quiz && (
        <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <LessonQuiz
            key={`quiz-attempt-${score === null ? 'fresh' : 'done'}`}
            quiz={lesson.quiz}
            accent={accent}
            onFinish={(s) => {
              setScore(s);
              if (lesson.nodeId && s.total > 0 && s.correct === s.total) {
                window.localStorage.setItem(`units-completed-${lesson.nodeId}`, '1');
                window.dispatchEvent(new Event('units-progress-changed'));
              }
              setPage(2);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* ============ NAVIGATION (hidden on result page) ============ */}
      {page !== 2 && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            className="btn-secondary !py-2.5 !px-5 text-sm inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            {page === 0 ? 'กลับไปเส้นทาง' : 'ย้อนกลับ'}
          </button>

          {page === 0 && hasQuiz && (
            <button
              type="button"
              onClick={goNext}
              className="btn-primary !py-2.5 !px-6 text-sm inline-flex items-center gap-2"
              style={{ background: accent.base }}
            >
              เข้าใจแล้ว ไปทำข้อสอบ
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          {page === totalPages - 1 && (
            <span className="text-xs text-slate-400 font-semibold">
              {page === 0 ? '' : 'จบบทเรียนนี้แล้ว 🎉'}
            </span>
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
