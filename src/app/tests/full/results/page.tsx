'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, ArrowRight, LogOut, Trophy, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { CEFR_COLORS, CEFR_DESCRIPTIONS } from '@/lib/cefr-estimator';
import type { CefrLevel } from '@/lib/cefr-estimator';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { FULL_TEST_TOTAL_SECONDS } from '@/lib/full-test/constants';

const PART_LABELS: Record<string, string> = {
  'focus-form': 'Grammar',
  'focus-meaning': 'Vocabulary',
  'form-meaning': 'Cloze (Fill-in-the-blank)',
  'listening': 'Listening',
  'full-test': 'Full Mock Exam',
};

interface ResultData {
  attemptId: number;
  score: number;
  cefrLevel: CefrLevel;
  correctAnswers: number;
  totalQuestions: number;
  adaptivePath: Array<{ testTypeId: string; cefrLevel: string; wasCorrect: boolean }>;
  perPart: Record<string, { total: number; correct: number }>;
}

export default function FullTestResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get('attemptId');
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }
    const numId = Number(attemptId);
    if (isNaN(numId)) {
      setLoading(false);
      return;
    }
    apiFetch(`/api/tests/full/result/${numId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setResult(data.data);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            toast.error('กรุณาเข้าสู่ระบบใหม่');
            router.push('/tests/full');
            return;
          }
          if (err.status === 429) {
            const secs = err.message.split(':')[1] || '60';
            toast.error(`ระบบทำงานช้า กรุณารอ ${secs} วินาทีแล้วลองใหม่`);
            return;
          }
        }
        toast.error('ไม่สามารถโหลดผลสอบได้');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [attemptId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">ไม่พบผลการสอบ</p>
        <Link href="/tests/full" className="text-primary-600 hover:underline mt-4 inline-block">
          กลับไปหน้าสอบจำลอง
        </Link>
      </div>
    );
  }

  const perPart = result.perPart || {};
  const percentage = Math.round(result.score);
  const passed = percentage >= 70;
  const wrongCount = result.totalQuestions - result.correctAnswers;
  const durationLabel = `${FULL_TEST_TOTAL_SECONDS / 60} นาที`;

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-[0_1px_6.4px_0_rgba(221,221,221,0.25)] shrink-0 z-40 pt-1 sticky top-0">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-0 md:h-[6.6875rem] h-[90px]">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-[1.375rem] text-[#5A6387] line-clamp-1">สอบจำลองเต็มรูปแบบ</h1>
                <div className="flex items-center gap-2 text-xs sm:text-[1rem] text-[#5A6387] font-medium">
                  <span>set 1 - {result.totalQuestions} ข้อ</span>
                  <span>|</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
            </div>
            <Link
              href="/tests"
              className="text-[#616161] text-sm sm:text-[1.125rem] rounded-lg font-semibold flex items-center shrink-0"
              aria-label="จบการสอบ"
            >
              <span className="hidden sm:inline">จบการสอบ</span>
              <LogOut className="w-5 h-5 text-slate-600 sm:ms-2" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-44">
        <div className="w-full max-w-[1080px] mx-auto bg-white rounded-3xl shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)] p-6 sm:p-7 mb-6">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
              {passed ? 'ยอดเยี่ยมมาก' : 'เกือบแล้ว'}
              <span aria-hidden="true">{passed ? '🎉' : '💪'}</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              คุณได้ทำแบบทดสอบ <span className="font-medium text-slate-700">สอบจำลองเต็มรูปแบบ</span> เรียบร้อยแล้ว ผลคะแนนของคุณคือ
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
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl py-3 text-center">
              <p className="text-[0.8125rem] font-medium text-[#797979] mb-1">ถูกต้อง</p>
              <p className="text-lg font-bold text-[#646464]">
                {result.correctAnswers} / {result.totalQuestions} ข้อ
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl py-3 text-center">
              <p className="text-[0.8125rem] font-medium text-[#797979] mb-1">ยังไม่ถูกต้อง</p>
              <p className="text-lg font-bold text-[#646464]">
                {wrongCount} / {result.totalQuestions} ข้อ
              </p>
            </div>
          </div>

          {/* CEFR level */}
          <div className="flex justify-center mb-5">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${CEFR_COLORS[result.cefrLevel]}`}>
              <span className="text-2xl font-bold">{result.cefrLevel}</span>
              <span className="text-sm">{CEFR_DESCRIPTIONS[result.cefrLevel]}</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-4 text-sm text-red-800 leading-relaxed">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-base">ข้อควรทราบ:</strong>
                <p className="mt-1">
                  ระดับ CEFR ที่แสดงเป็นผลการประเมินจากข้อสอบในระบบ CEFR Ready เพื่อการฝึกฝนเท่านั้น
                  <span className="font-semibold underline decoration-red-400 underline-offset-2"> ไม่ใช่ผลสอบ CEFR อย่างเป็นทางการ</span>
                  และอาจแตกต่างจากผลที่ได้รับในการสอบจริง
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Per-part breakdown */}
        <div className="w-full max-w-[1080px] mx-auto bg-white rounded-3xl shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)] p-6 sm:p-7">
          <h2 className="text-center text-[1rem] font-semibold text-[#585858] mb-4">สัดส่วนตามพาร์ท</h2>
          <div className="space-y-3">
            {Object.entries(perPart).map(([testTypeId, stats]) => (
              <div key={testTypeId} className="flex items-center justify-between">
                <span className="text-slate-700">{PART_LABELS[testTypeId] || testTypeId.replace(/-/g, ' ')}</span>
                <span className="font-medium">{stats.correct}/{stats.total} ข้อ</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                    strokeDasharray={`${result.totalQuestions > 0 ? (result.correctAnswers / result.totalQuestions) * 125.6 : 0} 125.6`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {percentage}%
                </span>
              </div>
              <div className="text-sm hidden sm:block">
                <p className="text-slate-900 font-medium">{result.correctAnswers} correct</p>
                <p className="text-slate-500">{wrongCount} wrong</p>
              </div>
              <p className="text-sm font-medium text-slate-900 sm:hidden">
                {result.correctAnswers}/{result.totalQuestions}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex items-center gap-2 md:gap-3 md:w-auto justify-center">
            <Link
              href="/tests/full"
              className="shrink-0 h-14 md:h-[3.375rem] px-4 md:px-6 rounded-full flex items-center space-x-1 justify-center transition-colors border-2 bg-white border-[#6D89EF] text-[#6D89EF]"
            >
              <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">สอบอีกครั้ง</span>
              <RotateCw className="size-[1.125rem]" />
            </Link>
            <Link
              href="/tests"
              className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full flex items-center space-x-1 justify-center text-white transition-colors"
            >
              <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">กลับหน้าข้อสอบ</span>
              <ArrowRight className="size-[1.125rem] shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
