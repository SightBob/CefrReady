'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { FULL_TEST_TOTAL_SECONDS } from '@/lib/full-test/constants';

const TestResults = dynamic(() => import('@/components/TestResults'), {
  ssr: false,
  loading: () => <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f7]" />,
});

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
  cefrLevel: string | null;
  correctAnswers: number | null;
  totalQuestions: number;
  /** คะแนนถ่วงน้ำหนักตามความยาก สเกล 0–120 (จาก normalizeScore ฝั่ง server) */
  normalizedScore: number | null;
  /** total/correct นับเป็น "ข้อ" — ช่องของบทความ Cloze แยกเก็บใน blanksTotal/blanksCorrect */
  perPart: Record<string, { total: number; correct: number; blanksTotal?: number; blanksCorrect?: number }>;
}

/**
 * หน้าผลสอบ Full Test — ใช้คอมโพเนนต์เดียวกับหน้าผลของพาร์ทอื่น (TestResults,
 * Figma 75-70682) ส่วนที่เฉพาะของ Full Test (สัดส่วนตามพาร์ท + ข้อความทางการ)
 * ส่งเข้าไปทาง extraContent โดยใช้ token เดียวกับการ์ดเฉลย
 */
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f7]">
        <div className="size-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f7f7] px-4 text-center">
        <p className="text-[14px] font-semibold leading-[24px] text-[#334155]">ไม่พบผลการสอบ</p>
        <Link
          href="/tests/full"
          className="mt-4 flex h-[44px] w-[216px] items-center justify-center rounded-[14px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-[15px] font-semibold text-[#524924]"
        >
          กลับไปหน้าสอบจำลอง
        </Link>
      </div>
    );
  }

  const perPartEntries = Object.entries(result.perPart || {});

  return (
    <TestResults
      score={result.correctAnswers ?? 0}
      totalQuestions={result.totalQuestions}
      attemptId={result.attemptId}
      onRestart={() => router.push('/tests/full/exam')}
      sectionIcon={Trophy}
      sectionColor="from-indigo-500 to-purple-500"
      headerTitle="สอบจำลองเต็มรูปแบบ"
      durationMinutes={FULL_TEST_TOTAL_SECONDS / 60}
      sectionId="full-test"
      cefrLevel={result.cefrLevel}
      extraContent={
        <>
          {result.normalizedScore != null && (
            <div className="flex w-full items-start justify-between gap-3 rounded-[30px] bg-white px-6 py-[18px]">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold leading-7 text-[#4a4a4a]">คะแนนรวม</h2>
                {/* อธิบายว่าสเกล 120 ไม่ใช่เปอร์เซ็นต์ข้อ — เดิมผู้เรียนเห็น 11/45 (24%)
                    คู่กับ 36/120 แล้วเข้าใจผิดว่าคำนวณผิด */}
                <p className="text-[12px] leading-5 text-[#64748b]">
                  ถ่วงน้ำหนักตามระดับความยากของข้อสอบ ไม่ใช่สัดส่วนข้อที่ถูก
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[18px] font-bold text-[#2b6c00]">
                  {result.normalizedScore}
                  <span className="text-[14px] font-semibold text-[#64748b]"> / 120</span>
                </span>
                <p className="whitespace-nowrap text-[12px] leading-5 text-[#64748b]">
                  ตอบถูก {result.correctAnswers ?? 0}/{result.totalQuestions} ข้อ ({result.score}%)
                </p>
              </div>
            </div>
          )}
          {perPartEntries.length > 0 && (
            <div className="w-full rounded-[30px] bg-white pb-6 pl-6 pr-[23px] pt-[18px]">
              <h2 className="text-center text-[18px] font-semibold leading-7 text-[#4a4a4a]">
                สัดส่วนตามพาร์ท
              </h2>
              <p className="mt-1 text-center text-[12px] leading-5 text-[#64748b]">
                นับเป็นข้อ (บทความ Cloze ทั้งเรื่อง = 1 ข้อ) รวม {result.correctAnswers ?? 0}/
                {result.totalQuestions} ข้อ
              </p>
              <div className="mt-4 w-full rounded-[18px] bg-[#F8F6EF] pb-[14px] pl-[14px] pr-[14px] pt-[14px]">
                <div className="flex w-full flex-col gap-[10px]">
                  {perPartEntries.map(([testTypeId, stats]) => (
                    <div
                      key={testTypeId}
                      className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-white px-[14px] py-[12px]"
                    >
                      <p className="min-w-0 flex-1 text-[14px] font-semibold text-[#1e293b]">
                        {PART_LABELS[testTypeId] || testTypeId.replace(/-/g, ' ')}
                      </p>
                      <span className="shrink-0 rounded-[8px] bg-[#F3F3F3] px-[10px] py-1 text-[12px] font-bold text-[#585E5F]">
                        {stats.correct}/{stats.total} ข้อ
                        {stats.blanksTotal ? ` (${stats.blanksCorrect ?? 0}/${stats.blanksTotal} ช่อง)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <p className="px-4 text-center text-[13px] leading-[22px] text-[#475569]">
            ระดับ CEFR ที่แสดงเป็นผลการประเมินจากข้อสอบในระบบ CEFR Ready เพื่อการฝึกฝนเท่านั้น{' '}
            <span className="font-semibold underline decoration-amber-400 underline-offset-2">ไม่ใช่ผลสอบ CEFR อย่างเป็นทางการ</span>{' '}
            และอาจแตกต่างจากผลที่ได้รับในการสอบจริง
          </p>
        </>
      }
    />
  );
}
