'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TOTAL_QUESTIONS = 45;
const TOTAL_SECONDS = 60 * 60;

interface Question {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  audioUrl?: string | null;
  transcript?: string | null;
  conversation?: Array<{ speaker: string; text: string }>;
  article?: { title: string; text: string; blanks: Array<{ id: number; correctAnswer: string; hint?: string }> };
  cefrLevel: string;
}

export default function FullTestExamPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/tests/full');
      return;
    }
    if (status === 'authenticated') {
      startOrResume();
    }
  }, [status, router]);

  const startOrResume = async () => {
    try {
      const resumeRes = await fetch('/api/tests/full/resume');
      const resumeData = await resumeRes.json();

      if (resumeData.success && resumeData.data && !resumeData.data.expired) {
        loadState(resumeData.data);
        setLoading(false);
        return;
      }

      if (resumeData.success && resumeData.data?.expired) {
        router.push('/tests/full/results');
        return;
      }

      const startRes = await fetch('/api/tests/full/start', { method: 'POST' });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);

      if (startData.data.resume) {
        const resumeRes2 = await fetch('/api/tests/full/resume');
        const resumeData2 = await resumeRes2.json();
        loadState(resumeData2.data);
      } else {
        loadState(startData.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถเริ่มข้อสอบได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadState = (data: any) => {
    setAttemptId(data.attemptId);
    setQuestion(data.question);
    setQuestionIndex(data.questionIndex);
    setTimeRemaining(data.timeRemaining ?? TOTAL_SECONDS);
    setSelectedAnswer(null);
  };

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  const handleTimeUp = async () => {
    if (!attemptId) return;
    setFinished(true);
    await fetch('/api/tests/full/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId }),
    });
    router.push(`/tests/full/results?attemptId=${attemptId}`);
  };

  const handleNext = async () => {
    if (!attemptId || !question || submitting) return;

    if (!selectedAnswer) {
      const confirmed = window.confirm('คุณยังไม่ได้เลือกคำตอบ ต้องการข้ามข้อนี้หรือไม่?');
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tests/full/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId: question.id,
          selectedAnswer: selectedAnswer ?? '',
          timeRemaining,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.data.finished) {
        router.push(`/tests/full/results?attemptId=${attemptId}`);
        return;
      }

      setQuestion(data.data.question);
      setQuestionIndex(data.data.questionIndex);
      setSelectedAnswer(null);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!attemptId) return;
    const confirmed = window.confirm('ต้องการยกเลิกการสอบ? คำตอบจะไม่ถูกบันทึก');
    if (!confirmed) return;
    await fetch('/api/tests/full/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId }),
    });
    router.push('/tests');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  if (!question) {
    return <div className="min-h-screen flex items-center justify-center">ไม่พบข้อสอบ</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
          style={{ width: `${((questionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}
        />
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">ข้อ {questionIndex + 1}/{TOTAL_QUESTIONS}</span>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-bold ${timeRemaining <= 120 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <div className="text-xs font-medium text-slate-500 uppercase mb-2">
            {question.testTypeId.replace(/-/g, ' ')}
          </div>
          <p className="text-lg font-medium text-slate-900 mb-6">{question.questionText}</p>

          {question.testTypeId !== 'form-meaning' && (
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((key) => {
                const value = question[`option${key}` as keyof Question] as string | null;
                if (!value) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedAnswer(key)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedAnswer === key
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold mr-2">{key}.</span>
                    {value}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={submitting}
            className="btn-primary py-3 px-8 disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : 'ข้อต่อไป'}
          </button>
        </div>
      </main>
    </div>
  );
}
