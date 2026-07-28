'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquareText, Star, X } from 'lucide-react';
import {
  HOME_TOUR_COMPLETED_KEY,
  HOME_TOUR_FINISHED_EVENT,
  shouldShowFeedbackDiscovery,
} from '@/lib/feedback-discovery';

const OPEN_DELAY_MS = 500;
const HOME_TOUR_STARTED_EVENT = 'cefrready-start-tour';
const SESSION_SHOWN_KEY = 'cefrready-survey-shown-this-session';

function markSessionShown() {
  try {
    sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
  } catch {
    // Storage unavailable — modal guard falls back to per-mount behavior.
  }
}

function hasSessionShown() {
  try {
    return sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

const HELPFULNESS_OPTIONS = [
  'ไม่ช่วยเลย',
  'ช่วยเล็กน้อย',
  'ช่วยปานกลาง',
  'ช่วยมาก',
  'ช่วยมากที่สุด',
] as const;

const WILLINGNESS_OPTIONS = [
  'ยินดีจ่าย',
  'อาจจะจ่าย ขึ้นอยู่กับราคาและฟีเจอร์',
  'ยังไม่แน่ใจ',
  'ไม่น่าจะจ่าย',
  'ต้องการใช้เฉพาะเวอร์ชันฟรี',
] as const;

const FEATURE_OPTIONS = [
  'จำนวนชุดข้อสอบที่มากขึ้น',
  'ข้อสอบจำลองที่ใกล้เคียงข้อสอบจริง',
  'ระบบวิเคราะห์จุดอ่อนรายบุคคล',
  'คำอธิบายเฉลยอย่างละเอียด',
  'ระบบแนะนำบทเรียนตามระดับ',
  'ใบรับรองหรือรายงานผล',
  'ไม่มีโฆษณา',
  'อื่น ๆ',
] as const;

interface SurveyAnswers {
  satisfaction: number | null;
  helpfulness: string | null;
  nps: number | null;
  willingness: string | null;
  features: string[];
  otherFeature: string;
  improvement: string;
}

const INITIAL_ANSWERS: SurveyAnswers = {
  satisfaction: null,
  helpfulness: null,
  nps: null,
  willingness: null,
  features: [],
  otherFeature: '',
  improvement: '',
};

function buildSurveyMessage(answers: SurveyAnswers): string {
  const featureList = answers.features
    .map((f) => (f === 'อื่น ๆ' && answers.otherFeature.trim()
      ? `อื่น ๆ: ${answers.otherFeature.trim()}`
      : f))
    .join(', ') || '-';

  return [
    '[Mini Survey]',
    `1. ความพึงพอใจโดยรวม: ${answers.satisfaction}/5`,
    `2. ช่วยเตรียมสอบ: ${answers.helpfulness}`,
    `3. ความน่าจะแนะนำ (NPS): ${answers.nps}/10`,
    `4. ยินดีจ่าย: ${answers.willingness}`,
    `5. สิ่งที่ทำให้ยินดีจ่ายมากขึ้น: ${featureList}`,
    `6. อยากให้ปรับปรุง/เพิ่ม: ${answers.improvement.trim() || '-'}`,
  ].join('\n');
}

const questionClass = 'text-sm font-semibold text-slate-900';
const optionButtonBase =
  'rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500';
const optionIdle = 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50';
const optionActive = 'border-primary-600 bg-primary-600 text-white';

export default function FeedbackDiscoveryModal() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<SurveyAnswers>(INITIAL_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const shownThisMount = useRef(false);

  const close = useCallback(() => {
    shownThisMount.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || shownThisMount.current) return;

    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const scheduleOpen = () => {
      if (shownThisMount.current || cancelled || hasSessionShown()) return;
      window.clearTimeout(openTimer);
      openTimer = setTimeout(() => {
        if (!shownThisMount.current && !cancelled && !hasSessionShown()) {
          markSessionShown();
          setOpen(true);
        }
      }, OPEN_DELAY_MS);
    };

    const readState = () => {
      try {
        return {
          tourCompleted: localStorage.getItem(HOME_TOUR_COMPLETED_KEY) === 'true',
        };
      } catch {
        shownThisMount.current = true;
        return { tourCompleted: false };
      }
    };

    const checkAndSchedule = async () => {
      if (!readState().tourCompleted || shownThisMount.current || cancelled || hasSessionShown()) return;
      try {
        const response = await fetch('/api/contacts?scope=survey');
        if (cancelled || shownThisMount.current || !response.ok) return;
        const data = (await response.json()) as { eligible?: boolean; submitted?: boolean };
        if (shouldShowFeedbackDiscovery({
          authenticated: true,
          tourCompleted: true,
          eligible: data.eligible === true,
          submitted: data.submitted === true,
        })) {
          scheduleOpen();
        }
      } catch {
        // Network failure — skip showing this visit.
      }
    };

    void checkAndSchedule();

    const handleTourStarted = () => {
      window.clearTimeout(openTimer);
      setOpen(false);
    };

    const handleTourFinished = () => {
      if (shownThisMount.current) return;
      void checkAndSchedule();
    };

    window.addEventListener(HOME_TOUR_STARTED_EVENT, handleTourStarted);
    window.addEventListener(HOME_TOUR_FINISHED_EVENT, handleTourFinished);

    return () => {
      cancelled = true;
      window.clearTimeout(openTimer);
      window.removeEventListener(HOME_TOUR_STARTED_EVENT, handleTourStarted);
      window.removeEventListener(HOME_TOUR_FINISHED_EVENT, handleTourFinished);
    };
  }, [status, close]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [close, open]);

  const toggleFeature = (feature: string) => {
    setAnswers((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const requiredComplete =
    answers.satisfaction !== null &&
    answers.helpfulness !== null &&
    answers.nps !== null &&
    answers.willingness !== null;

  const handleSubmit = async () => {
    if (!requiredComplete || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: buildSurveyMessage(answers) }),
      });

      if (response.ok) {
        setSubmitted(true);
        return;
      }

      if (response.status === 429) {
        setError('ส่งบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง');
      } else if (response.status === 401) {
        setError('กรุณาเข้าสู่ระบบก่อนส่งความคิดเห็น');
      } else {
        setError('ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setError('เครือข่ายมีปัญหา กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        aria-label="ปิดหน้าต่างความคิดเห็น"
        onClick={close}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-discovery-title"
        aria-describedby="feedback-discovery-description"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="ปิด"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <h2 id="feedback-discovery-title" className="text-2xl font-bold tracking-tight text-slate-900">
              ขอบคุณสำหรับความคิดเห็น
            </h2>
            <p id="feedback-discovery-description" className="mt-3 text-sm leading-6 text-slate-600">
              เราจะนำความคิดเห็นของคุณไปพัฒนา CEFR Ready ให้ดียิ่งขึ้น
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-7 rounded-full bg-[#111] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <h2 id="feedback-discovery-title" className="pr-8 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              ช่วยบอกความคิดเห็นเกี่ยวกับ CEFR Ready
            </h2>
            <p id="feedback-discovery-description" className="mt-2 text-sm leading-6 text-slate-600">
              ใช้เวลาประมาณ 30 วินาที ความคิดเห็นของคุณจะช่วยให้เราพัฒนาระบบให้ดีขึ้น
            </p>

            <div className="mt-6 space-y-6">
              <fieldset>
                <legend className={questionClass}>
                  1. โดยรวมแล้ว คุณพึงพอใจกับ CEFR Ready มากน้อยเพียงใด? <span className="text-red-500">*</span>
                </legend>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, satisfaction: value }))}
                      aria-label={`${value} ดาว`}
                      aria-pressed={answers.satisfaction === value}
                      className="rounded-lg p-1.5 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          answers.satisfaction !== null && value <= answers.satisfaction
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  {answers.satisfaction !== null && (
                    <span className="ml-2 text-sm text-slate-500">{answers.satisfaction}/5</span>
                  )}
                </div>
              </fieldset>

              <fieldset>
                <legend className={questionClass}>
                  2. CEFR Ready ช่วยให้คุณเตรียมตัวสอบภาษาอังกฤษได้มากน้อยเพียงใด? <span className="text-red-500">*</span>
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HELPFULNESS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, helpfulness: option }))}
                      aria-pressed={answers.helpfulness === option}
                      className={`${optionButtonBase} ${answers.helpfulness === option ? optionActive : optionIdle}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={questionClass}>
                  3. คุณมีแนวโน้มจะแนะนำ CEFR Ready ให้เพื่อนมากน้อยเพียงใด? <span className="text-red-500">*</span>
                </legend>
                <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                  {Array.from({ length: 11 }, (_, value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, nps: value }))}
                      aria-pressed={answers.nps === value}
                      className={`rounded-lg border py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        answers.nps === value ? optionActive : optionIdle
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>ไม่แนะนำอย่างแน่นอน</span>
                  <span>แนะนำอย่างแน่นอน</span>
                </div>
              </fieldset>

              <fieldset>
                <legend className={questionClass}>
                  4. หากในอนาคตมีฟีเจอร์เพิ่มเติมและมีการเก็บค่าบริการ คุณมีแนวโน้มจะสมัครใช้บริการหรือไม่? <span className="text-red-500">*</span>
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {WILLINGNESS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, willingness: option }))}
                      aria-pressed={answers.willingness === option}
                      className={`${optionButtonBase} text-left ${answers.willingness === option ? optionActive : optionIdle}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={questionClass}>
                  5. อะไรที่จะทำให้คุณยินดีจ่ายมากขึ้น? <span className="font-normal text-slate-500">(เลือกได้มากกว่า 1 ข้อ)</span>
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {FEATURE_OPTIONS.map((option) => {
                    const checked = answers.features.includes(option);
                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                          checked ? 'border-primary-600 bg-primary-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeature(option)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        {option}
                      </label>
                    );
                  })}
                  {answers.features.includes('อื่น ๆ') && (
                    <input
                      type="text"
                      value={answers.otherFeature}
                      onChange={(event) => setAnswers((prev) => ({ ...prev, otherFeature: event.target.value }))}
                      placeholder="โปรดระบุ"
                      maxLength={200}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>
              </fieldset>

              <fieldset>
                <legend className={questionClass}>
                  6. คุณอยากให้เราปรับปรุงหรือเพิ่มอะไรใน CEFR Ready มากที่สุด?
                </legend>
                <textarea
                  value={answers.improvement}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, improvement: event.target.value }))}
                  placeholder="พิมพ์ความคิดเห็นของคุณที่นี่"
                  maxLength={2000}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </fieldset>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                ไว้ภายหลัง
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!requiredComplete || submitting}
                className="rounded-full bg-[#111] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
