'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CEFR_COLORS, CEFR_DESCRIPTIONS } from '@/lib/cefr-estimator';
import type { CefrLevel } from '@/lib/cefr-estimator';

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
  const attemptId = searchParams.get('attemptId');
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }
    fetch(`/api/tests/full/result/${attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setResult(data.data);
        }
        setLoading(false);
      });
  }, [attemptId]);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-5 h-5" /> กลับไปหน้าข้อสอบ
      </Link>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ผลการสอบจำลอง</h1>
        <p className="text-slate-600 mb-6">คะแนนรวมของคุณ</p>

        <div className="text-5xl font-bold text-slate-900 mb-2">{result.score}%</div>
        <p className="text-slate-500 mb-6">
          ถูก {result.correctAnswers} จาก {result.totalQuestions} ข้อ
        </p>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${CEFR_COLORS[result.cefrLevel]}`}>
          <span className="text-2xl font-bold">{result.cefrLevel}</span>
          <span className="text-sm">{CEFR_DESCRIPTIONS[result.cefrLevel]}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">สัดส่วนตามพาร์ท</h2>
        <div className="space-y-3">
          {Object.entries(perPart).map(([testTypeId, stats]) => (
            <div key={testTypeId} className="flex items-center justify-between">
              <span className="text-slate-700">{PART_LABELS[testTypeId] || testTypeId.replace(/-/g, ' ')}</span>
              <span className="font-medium">{stats.correct}/{stats.total} ข้อ</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Link href="/tests/full" className="btn-primary">
          สอบอีกครั้ง
        </Link>
        <Link href="/tests" className="btn-secondary">
          กลับหน้าข้อสอบ
        </Link>
      </div>
    </div>
  );
}