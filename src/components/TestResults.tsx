'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, LogOut, PenTool, RotateCcw, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { usePostHog } from '@/lib/posthog';

interface RetryResultSummary {
  questionId: number;
  recovered: boolean;
}

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  isDemo?: boolean;
  attemptId?: number | null;
  onRestart: () => void;
  nextSetLabel?: string;
  onNextSet?: () => void;
  sectionIcon?: React.ElementType;
  sectionColor?: string;
  headerTitle?: string;
  durationMinutes?: number;
  setNumber?: number;
  /** Review Round outcomes — section hidden when absent (backward compatible). */
  retryResults?: RetryResultSummary[];
}

export default function TestResults({
  score,
  totalQuestions,
  isDemo = false,
  attemptId,
  onRestart,
  nextSetLabel,
  onNextSet,
  sectionIcon: SectionIcon = PenTool,
  sectionColor = 'from-blue-500 to-cyan-500',
  headerTitle = 'ผลการสอบ',
  durationMinutes,
  setNumber = 1,
  retryResults,
}: TestResultsProps) {
  const posthog = usePostHog();
  const percentage = Math.round((score / totalQuestions) * 100);
  const passed = percentage >= 70;
  const effectiveMinutes = durationMinutes && durationMinutes > 0 ? durationMinutes : 20;
  const durationLabel = `${effectiveMinutes} นาที`;
  const wrongCount = totalQuestions - score;
  // Review Round stats (undefined → section hidden)
  const recoveredCount = retryResults?.filter((r) => r.recovered).length ?? 0;
  const stillWrongCount = (retryResults?.length ?? 0) - recoveredCount;

  useEffect(() => {
    posthog?.capture('test_result_viewed', {
      score_percentage: percentage,
      passed: percentage >= 70,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-[0_1px_6.4px_0_rgba(221,221,221,0.25)] shrink-0 z-40 pt-1 sticky top-0">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-0 md:h-[6.6875rem] h-[90px]">
            <div className="flex items-center gap-2 md:gap-4">
              <div className={`bg-gradient-to-br ${sectionColor} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0`}>
                <SectionIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-[1.375rem] text-[#5A6387] line-clamp-1">{headerTitle}</h1>
                <div className="flex items-center gap-2 text-xs sm:text-[1rem] text-[#5A6387] font-medium">
                  <span>set 1 - {totalQuestions} ข้อ</span>
                  <span>|</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
            </div>
            <Link
              href={isDemo ? "/demo" : "/tests"}
              className="text-[#616161] text-sm sm:text-[1.125rem] rounded-lg font-semibold flex items-center shrink-0"
              aria-label="จบการสอบ"
            >
              <span className="hidden sm:inline">จบการสอบ</span>
              <LogOut className="w-5 h-5 text-slate-600 sm:ms-2" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-44">

      <div className="w-full max-w-[1080px] mx-auto bg-white rounded-3xl shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)] p-6 sm:p-7">
        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
            {passed ? 'ยอดเยี่ยมมาก' : 'เกือบแล้ว'}
            <span aria-hidden="true">{passed ? '🎉' : '💪'}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            คุณได้ทำแบบทดสอบ <span className="font-medium text-slate-700">{headerTitle}</span> ชุดที่ {setNumber} เรียบร้อยแล้ว ผลคะแนนของคุณคือ
          </p>
        </div>

        {/* Result box */}
        <div className={`rounded-2xl p-5 text-center mb-5 ${passed ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <p className={`text-4xl font-extrabold ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>
            {percentage}%
          </p>
          <p className={`flex items-center justify-center gap-1 font-bold mt-1 ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
            {passed ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {passed ? 'ผ่านเกณฑ์' : 'ยังไม่ผ่านเกณฑ์'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            (เกณฑ์ผ่าน = 70% ขึ้นไป)
          </p>
        </div>

        <hr className="border-slate-100 mb-4" />

        <p className="text-center text-[1rem] font-semibold text-[#585858] mb-3">รายละเอียดคะแนน</p>

        {/* Score breakdown */}
        <div className="bg-slate-50 rounded-xl py-3 text-center">
          <p className="text-[0.8125rem] font-medium text-[#797979] mb-1">ถูกต้อง</p>
          <p className="text-lg font-bold text-[#646464]">
            {score} / {totalQuestions} ข้อ
          </p>
        </div>
      </div>

      {isDemo && (
          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <p className="text-primary-700 font-medium">Want more questions and progress tracking?</p>
            <Link href="/tests" className="text-primary-600 hover:text-primary-700 underline font-medium">
              Login for Full Tests →
            </Link>
          </div>
        )}
      </div>

      {/* Review Round summary — rendered only when retry data exists */}
      {retryResults && retryResults.length > 0 && (
        <div className="w-full max-w-[1080px] mx-auto bg-white rounded-3xl shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)] p-6 sm:p-7 mt-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            รอบทบทวน
          </h3>
          <p className="text-sm text-slate-500">
            คะแนนของคุณนับจากรอบแรกเท่านั้น — นี่คือผลจากการทบทวนข้อที่ผิด
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              ✅ แก้ได้ {recoveredCount}
            </span>
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600">
              ⚠️ ยังไม่เข้าใจ {stillWrongCount}
            </span>
          </div>
        </div>
      )}

      {/* Universal Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)]">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-0 md:min-h-[8rem] flex flex-col md:flex-row items-center justify-between gap-3 w-full">
          {/* Score Ring */}
          <div className="w-full md:w-auto p-2 md:p-0 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 scale-90 md:scale-100 origin-center shrink-0">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="none" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${totalQuestions > 0 ? (score / totalQuestions) * 125.6 : 0} 125.6`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {percentage}%
                </span>
              </div>
              <div className="text-sm hidden sm:block">
                <p className="text-slate-900 font-medium">{score} correct</p>
                <p className="text-slate-500">{wrongCount} wrong</p>
              </div>
              <p className="text-sm font-medium text-slate-900 sm:hidden">
                {score}/{totalQuestions}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex items-center gap-2 md:gap-3 md:w-auto justify-center">
            {isDemo ? (
              <>
                <button
                  onClick={onRestart}
                  className="flex-1 md:flex-none h-14 md:h-[3.375rem] px-6 bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full text-white text-base md:text-[1.125rem] font-bold transition-colors whitespace-nowrap"
                >
                  Try Again
                </button>
                <Link
                  href="/demo"
                  className="flex-1 md:flex-none h-14 md:h-[3.375rem] px-6 rounded-full border-2 border-[#6D89EF] text-[#6D89EF] bg-white flex items-center justify-center text-base md:text-[1.125rem] font-bold transition-colors whitespace-nowrap"
                >
                  Other Demo Tests
                </Link>
              </>
            ) : (
              <button
                onClick={onRestart}
                className={`shrink-0 h-14 md:h-[3.375rem] px-4 md:px-6 rounded-full flex items-center space-x-1 justify-center transition-colors border-2 bg-white border-[#6D89EF] text-[#6D89EF]`}
          >
            <span className='text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap'>ทำอีกครั้ง</span>
            <RotateCw className='size-[1.125rem] font-bold' />
          </button>
            )}
            {nextSetLabel && onNextSet && (
              <button
                onClick={onNextSet}
                className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full flex items-center space-x-1 justify-center text-white transition-colors"
              >
                <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">{nextSetLabel}</span>
                <ArrowRight className="size-[1.125rem] shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
