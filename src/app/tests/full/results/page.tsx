'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CEFR_COLORS, CEFR_DESCRIPTIONS } from '@/lib/cefr-estimator';
import type { CefrLevel } from '@/lib/cefr-estimator';
import StarRating from '@/components/StarRating';

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

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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
    fetch(`/api/tests/full/result/${numId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setResult(data.data);
        }
        setLoading(false);
      });
  }, [attemptId]);

  const handleFeedbackSubmit = async () => {
    if (!attemptId || rating === 0 || submittingFeedback) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/tests/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: Number(attemptId), rating, comment: comment || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSubmitted(true);
      toast.success('ขอบคุณสำหรับคะแนน!');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmittingFeedback(false);
    }
  };

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

        <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-xl px-5 py-4 text-sm text-red-800 text-left leading-relaxed">
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

      {attemptId && !feedbackSubmitted && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="bg-amber-100 p-2 rounded-xl">
              <MessageSquare className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">ให้คะแนนการทดสอบ</h3>
              <p className="text-xs text-slate-500">ช่วยเราปรับปรุงให้ดีขึ้น</p>
            </div>
          </div>

          <StarRating value={rating} onChange={setRating} size="lg" />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-colors placeholder:text-slate-300 mt-4"
          />
          <p className="text-xs text-slate-400 text-right mt-1">{comment.length}/1000</p>

          <button
            onClick={handleFeedbackSubmit}
            disabled={rating === 0 || submittingFeedback}
            className="w-full mt-4 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {submittingFeedback ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
            ) : (
              'ส่งคะแนน'
            )}
          </button>
        </div>
      )}

      {attemptId && feedbackSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="font-medium text-emerald-800">ขอบคุณสำหรับคะแนน!</p>
          <p className="text-sm text-emerald-600">คะแนนของคุณช่วยเราปรับปรุงการทดสอบให้ดีขึ้น</p>
        </div>
      )}

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