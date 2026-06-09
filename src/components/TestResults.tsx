'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import StarRating from './StarRating';

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  isDemo?: boolean;
  attemptId?: number | null;
  onRestart: () => void;
}

export default function TestResults({ score, totalQuestions, isDemo = false, attemptId, onRestart }: TestResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const passed = percentage >= 70;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!attemptId || rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tests/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, rating, comment: comment || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSubmitted(true);
      toast.success('ขอบคุณสำหรับคะแนน!');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={isDemo ? "/demo" : "/tests"} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
        ← Back to {isDemo ? "Demo Tests" : "Tests"}
      </Link>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
          {passed ? (
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {passed ? (isDemo ? 'Great Job!' : 'Congratulations!') : 'Keep Practicing!'}
        </h1>
        <p className="text-slate-600 mb-6">
          {passed
            ? (isDemo ? 'You passed the demo test!' : 'You passed the test!')
            : 'You need 70% to pass. Try again!'}
        </p>

        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
          <p className="text-slate-500">{score} out of {totalQuestions} correct</p>
        </div>

        {!isDemo && (
          <div className="flex gap-4 justify-center">
            <button onClick={onRestart} className="btn-primary">
              Other Tests
            </button>
          </div>
        )}

        {isDemo && (
          <>
            <div className="bg-primary-50 rounded-xl p-4 mb-6">
              <p className="text-primary-700 font-medium">Want more questions and progress tracking?</p>
              <Link href="/tests" className="text-primary-600 hover:text-primary-700 underline font-medium">
                Login for Full Tests →
              </Link>
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={onRestart} className="btn-primary">
                Try Again
              </button>
              <Link href="/demo" className="btn-secondary">
                Other Demo Tests
              </Link>
            </div>
          </>
        )}
      </div>

      {attemptId && !feedbackSubmitted && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mt-6">
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
            disabled={rating === 0 || submitting}
            className="w-full mt-4 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
            ) : (
              'ส่งคะแนน'
            )}
          </button>
        </div>
      )}

      {attemptId && feedbackSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="font-medium text-emerald-800">ขอบคุณสำหรับคะแนน!</p>
          <p className="text-sm text-emerald-600">คะแนนของคุณช่วยเราปรับปรุงการทดสอบให้ดีขึ้น</p>
        </div>
      )}
    </div>
  );
}
