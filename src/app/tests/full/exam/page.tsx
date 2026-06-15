'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import ListeningAudioPlayer from '@/components/ListeningAudioPlayer';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import FormMeaningQuiz from '@/components/FormMeaningQuiz';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';

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

interface ExamState {
  attemptId: number;
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
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
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [skipConfirmMessage, setSkipConfirmMessage] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const attemptIdRef = useRef<number | null>(null);
  const timeUpHandledRef = useRef(false);
  const submittingRef = useRef(false);
  const initializedRef = useRef(false);
  const selectedAnswerRef = useRef<string | null>(null);

  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  const setSelectedAnswerSynced = useCallback((answer: string | null) => {
    selectedAnswerRef.current = answer;
    setSelectedAnswer(answer);
  }, []);

  const loadState = useCallback((data: ExamState) => {
    setAttemptId(data.attemptId);
    setQuestion(data.question);
    setQuestionIndex(data.questionIndex);
    setTimeRemaining(data.timeRemaining ?? TOTAL_SECONDS);
    selectedAnswerRef.current = null;
    setSelectedAnswer(null);
  }, []);

  const startOrResume = useCallback(async () => {
    if (initializedRef.current || attemptIdRef.current) return;
    initializedRef.current = true;
    console.log('[startOrResume] called');
    try {
      const resumeRes = await fetch('/api/tests/full/resume');
      const resumeData = await resumeRes.json();

      if (resumeData.success && resumeData.data && !resumeData.data.expired) {
        loadState(resumeData.data as ExamState);
        setLoading(false);
        return;
      }

      if (resumeData.success && resumeData.data?.expired) {
        const resultAttemptId = resumeData.data.result?.attemptId;
        router.push(resultAttemptId ? `/tests/full/results?attemptId=${resultAttemptId}` : '/tests/full/results');
        return;
      }

      const startRes = await fetch('/api/tests/full/start', { method: 'POST' });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);

      if (startData.data.resume) {
        const resumeRes2 = await fetch('/api/tests/full/resume');
        const resumeData2 = await resumeRes2.json();
        loadState(resumeData2.data as ExamState);
      } else {
        loadState(startData.data as ExamState);
      }
    } catch (err) {
      initializedRef.current = false;
      toast.error('ไม่สามารถเริ่มข้อสอบได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadState, router]);

  // Countdown timer
  useEffect(() => {
    if (finished || loading) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [finished, loading]);

  const handleTimeUp = useCallback(async () => {
    const id = attemptIdRef.current;
    if (!id || timeUpHandledRef.current) return;
    timeUpHandledRef.current = true;
    setFinished(true);
    await fetch('/api/tests/full/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: id }),
    });
    router.push(`/tests/full/results?attemptId=${id}`);
  }, [router]);

  useEffect(() => {
    if (finished || loading || timeRemaining > 0) return;
    handleTimeUp();
  }, [finished, loading, timeRemaining, handleTimeUp]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/tests/full');
      return;
    }
    if (status === 'authenticated') {
      startOrResume();
    }
  }, [status, router, startOrResume]);

  const handleNextClick = () => {
    if (!attemptIdRef.current || !question || submitting) return;

    if (question.testTypeId === 'form-meaning' && question.article) {
      let answers: Record<number, string> = {};
      try {
        answers = selectedAnswerRef.current ? JSON.parse(selectedAnswerRef.current) : {};
      } catch {
        answers = {};
      }
      const allFilled = question.article.blanks.every((b) => answers[b.id]?.trim());
      if (!allFilled) {
        setSkipConfirmMessage('คุณยังไม่ได้กรอกคำตอบให้ครบทุกช่อง หากข้ามข้อนี้จะถือว่าคำตอบข้อนี้ผิด');
        setSkipConfirmOpen(true);
        return;
      }
    }

    if (!selectedAnswerRef.current) {
      setSkipConfirmMessage('คุณยังไม่ได้เลือกคำตอบ หากข้ามข้อนี้จะถือว่าคำตอบข้อนี้ผิด');
      setSkipConfirmOpen(true);
      return;
    }

    handleNext();
  };

  const confirmSkip = () => {
    setSkipConfirmOpen(false);
    handleNext();
  };

  const handleNext = async () => {
    if (!attemptIdRef.current || !question || submittingRef.current) return;

    console.log('[handleNext] called with question:', question?.id, 'answer:', selectedAnswerRef.current);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tests/full/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attemptIdRef.current,
          questionId: question.id,
          selectedAnswer: selectedAnswerRef.current ?? '',
          timeRemaining,
        }),
      });
      const data = await res.json();
      console.log('[handleNext] response:', JSON.stringify(data));
      if (!data.success) throw new Error(data.error);

      if (data.data.finished) {
        await fetch('/api/tests/full/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: attemptIdRef.current }),
        });
        router.push(`/tests/full/results?attemptId=${attemptIdRef.current}`);
        return;
      }

      setQuestion(data.data.question);
      setQuestionIndex(data.data.questionIndex);
      selectedAnswerRef.current = null;
      setSelectedAnswer(null);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      console.error(err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (!attemptIdRef.current) return;
    setCancelConfirmOpen(true);
  };

  const confirmCancel = async () => {
    if (!attemptIdRef.current) return;
    setCancelConfirmOpen(false);
    await fetch('/api/tests/full/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attemptIdRef.current }),
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
          <button type="button" onClick={handleCancelClick} className="p-2 hover:bg-slate-100 rounded-lg">
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
        <div>
            {question.testTypeId === 'focus-form' ? (
              <div key={question.id} className="mb-6">
            <div className="text-xs font-medium text-slate-500 uppercase mb-2">
              {question.testTypeId.replace(/-/g, ' ')}
            </div>
            <FocusFormQuestionCard
              questionText={question.questionText}
              options={[
                { key: 'A', value: question.optionA ?? '' },
                { key: 'B', value: question.optionB ?? '' },
                { key: 'C', value: question.optionC ?? '' },
                { key: 'D', value: question.optionD ?? '' },
              ]}
              selectedAnswer={selectedAnswer}
              correctAnswer={null}
              explanation={null}
              conversation={question.conversation ?? null}
              onAnswerSelect={setSelectedAnswerSynced}
              disabled={submitting}
            />
          </div>
        ) : (
          <div key={question.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
            <div className="text-xs font-medium text-slate-500 uppercase mb-2">
              {question.testTypeId.replace(/-/g, ' ')}
            </div>

            {question.testTypeId === 'listening' && (
              <ListeningAudioPlayer
                audioUrl={question.audioUrl ?? undefined}
                transcript={question.transcript ?? question.questionText}
                questionText={question.questionText}
                options={[
                  { key: 'A', value: question.optionA ?? '' },
                  { key: 'B', value: question.optionB ?? '' },
                  { key: 'C', value: question.optionC ?? '' },
                  { key: 'D', value: question.optionD ?? '' },
                ]}
                selectedAnswer={selectedAnswer}
                correctAnswer={null}
                explanation={null}
                onAnswerSelect={setSelectedAnswerSynced}
                hideFeedback
              />
            )}

            {question.testTypeId === 'focus-meaning' && (
              <FocusMeaningConversationCard
                conversation={question.conversation ?? []}
                question={question.questionText}
                options={[
                  question.optionA ?? '',
                  question.optionB ?? '',
                  question.optionC ?? '',
                  question.optionD ?? '',
                ]}
                selectedAnswer={selectedAnswer ? ['A','B','C','D'].indexOf(selectedAnswer) : null}
                correctAnswer={null}
                explanation={''}
                onAnswerSelect={(idx) => setSelectedAnswerSynced(['A','B','C','D'][idx])}
                hideFeedback
              />
            )}

            {question.testTypeId === 'form-meaning' && question.article && (
              <FormMeaningQuiz
                article={question.article}
                onChange={(answers) => setSelectedAnswerSynced(JSON.stringify(answers))}
              />
            )}
          </div>
        )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNextClick}
              disabled={submitting}
              className="btn-primary py-3 px-8 disabled:opacity-50"
            >
              {submitting ? 'กำลังบันทึก...' : 'ข้อต่อไป'}
            </button>
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={skipConfirmOpen}
        title="ข้ามข้อนี้?"
        description={skipConfirmMessage}
        confirmLabel="ข้าม"
        cancelLabel="ทำต่อ"
        type="warning"
        onConfirm={confirmSkip}
        onCancel={() => setSkipConfirmOpen(false)}
        isLoading={submitting}
      />

      <ConfirmModal
        isOpen={cancelConfirmOpen}
        title="ยกเลิกการสอบ?"
        description="คำตอบทั้งหมดจะไม่ถูกบันทึก ต้องการยกเลิกการสอบหรือไม่?"
        confirmLabel="ยกเลิก"
        cancelLabel="ทำต่อ"
        type="danger"
        onConfirm={confirmCancel}
        onCancel={() => setCancelConfirmOpen(false)}
        isLoading={submitting}
      />
    </div>
  );
}
