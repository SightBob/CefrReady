'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TestLayout from '@/components/TestLayout';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { FULL_TEST_TOTAL_QUESTIONS, FULL_TEST_TOTAL_SECONDS } from '@/lib/full-test/constants';

const ListeningAudioPlayer = dynamic(() => import('@/components/ListeningAudioPlayer'));
const FocusMeaningConversationCard = dynamic(() => import('@/components/FocusMeaningConversationCard'));
const FormMeaningQuiz = dynamic(() => import('@/components/FormMeaningQuiz'));
const FocusFormQuestionCard = dynamic(() => import('@/components/FocusFormQuestionCard'));


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
  const [timeRemaining, setTimeRemaining] = useState(FULL_TEST_TOTAL_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [skipConfirmMessage, setSkipConfirmMessage] = useState('');
  const [revealed, setRevealed] = useState<{ mcq: string | null; blanks: Record<number, string> | null } | null>(null);

  const attemptIdRef = useRef<number | null>(null);
  const questionIdRef = useRef<number | null>(null);
  const endTimeRef = useRef<number>(0);
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
    const remaining = data.timeRemaining ?? FULL_TEST_TOTAL_SECONDS;
    setTimeRemaining(remaining);
    endTimeRef.current = Date.now() + remaining * 1000;
    selectedAnswerRef.current = null;
    setSelectedAnswer(null);
    questionIdRef.current = data.question.id;
    setRevealed(null);
  }, []);

  // Reveal the answer key for the current question after the user committed a
  // choice (options lock client-side once revealed).
  const checkAnswer = useCallback(async (questionId: number) => {
    const attempt = attemptIdRef.current;
    if (!attempt || questionIdRef.current !== questionId) return;
    try {
      const res = await apiFetch('/api/tests/full/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt, questionId }),
      });
      const data = await res.json();
      if (!data.success || questionIdRef.current !== questionId) return;
      if (data.data.type === 'cloze') {
        const blanks: Record<number, string> = {};
        Object.entries(data.data.blanks as Record<string, string>).forEach(([k, v]) => {
          blanks[Number(k)] = v;
        });
        setRevealed({ mcq: null, blanks });
      } else {
        setRevealed({ mcq: data.data.correctAnswer as string | null, blanks: null });
      }
    } catch {
      // Non-fatal: exam continues without reveal
    }
  }, []);

  const startOrResume = useCallback(async () => {
    if (initializedRef.current || attemptIdRef.current) return;
    initializedRef.current = true;
    try {
      const resumeRes = await apiFetch('/api/tests/full/resume');
      const resumeData = await resumeRes.json();

      if (resumeData.success && resumeData.data && !resumeData.data.expired && !resumeData.data.completed) {
        loadState(resumeData.data as ExamState);
        setLoading(false);
        return;
      }

      if (resumeData.success && (resumeData.data?.expired || resumeData.data?.completed)) {
        const resultAttemptId = resumeData.data.result?.attemptId;
        router.push(resultAttemptId ? `/tests/full/results?attemptId=${resultAttemptId}` : '/tests/full/results');
        return;
      }

      const startRes = await apiFetch('/api/tests/full/start', { method: 'POST' });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);

      if (startData.data.resume) {
        const resumeRes2 = await apiFetch('/api/tests/full/resume');
        const resumeData2 = await resumeRes2.json();
        loadState(resumeData2.data as ExamState);
      } else {
        loadState(startData.data as ExamState);
      }
    } catch (err) {
      initializedRef.current = false;
      if (err instanceof ApiError && err.status === 401) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
        router.push('/tests/full');
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const secs = err.message.split(':')[1] || '60';
        toast.error(`ระบบทำงานช้า กรุณารอ ${secs} วินาทีแล้วลองใหม่`);
      } else {
        toast.error('ไม่สามารถเริ่มข้อสอบได้');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadState, router]);

  const handleTimeUp = useCallback(async () => {
    const id = attemptIdRef.current;
    if (!id || timeUpHandledRef.current || submittingRef.current) return;
    // Set both refs synchronously before any async work
    timeUpHandledRef.current = true;
    submittingRef.current = true;
    // Pin endTimeRef into the past so subsequent ticks cannot re-fire
    endTimeRef.current = Date.now() - 1;
    setSubmitting(true);
    setFinished(true);
    try {
      const submitRes = await apiFetch('/api/tests/full/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: id }),
      });
      const submitData = await submitRes.json();
      if (!submitData.success) {
        toast.error(submitData.error || 'เกิดข้อผิดพลาดในการส่งคำตอบ กรุณาลองใหม่');
        timeUpHandledRef.current = false;
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      router.push(`/tests/full/results?attemptId=${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
        router.push('/tests/full');
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const secs = err.message.split(':')[1] || '60';
        toast.error(`ระบบทำงานช้า กรุณารอ ${secs} วินาทีแล้วลองใหม่`);
      } else {
        toast.error('เกิดข้อผิดพลาดในการส่งคำตอบ กรุณาลองใหม่');
      }
      console.error(err);
      timeUpHandledRef.current = false;
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [router]);

  // Countdown timer: delta-based to eliminate drift over long sessions
  useEffect(() => {
    if (finished || loading || !endTimeRef.current) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        handleTimeUp();
      }
    };

    tick(); // Run immediately
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [finished, loading, handleTimeUp]);

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

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/tests/full/next', {
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
      if (!data.success) throw new Error(data.error || 'Unknown error');

      if (data.data.finished) {
        const submitRes = await apiFetch('/api/tests/full/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: attemptIdRef.current }),
        });
        const submitData = await submitRes.json();
        if (!submitData.success) throw new Error(submitData.error || 'Submit failed');
        router.push(`/tests/full/results?attemptId=${attemptIdRef.current}`);
        return;
      }

      setQuestion(data.data.question);
      setQuestionIndex(data.data.questionIndex);
      selectedAnswerRef.current = null;
      setSelectedAnswer(null);
      questionIdRef.current = data.data.question.id;
      setRevealed(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
        router.push('/tests/full');
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const secs = err.message.split(':')[1] || '60';
        toast.error(`ระบบทำงานช้า กรุณารอ ${secs} วินาทีแล้วลองใหม่`);
      } else {
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        toast.error(msg);
      }
      console.error(err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // TestLayout's exit confirm calls this — cancels the attempt server-side.
  const handleExit = async () => {
    if (!attemptIdRef.current) return;
    await apiFetch('/api/tests/full/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId: attemptIdRef.current }),
    });
    router.push('/tests');
  };

  const progressAnswers = useMemo(
    () => Array.from({ length: FULL_TEST_TOTAL_QUESTIONS }, (_, i) => (i < questionIndex ? 'x' : null)),
    [questionIndex]
  );

  const handleMcqSelect = useCallback((key: string) => {
    setSelectedAnswerSynced(key);
    const qid = questionIdRef.current;
    if (qid) void checkAnswer(qid);
  }, [checkAnswer, setSelectedAnswerSynced]);

  const handleClozeChange = (answersMap: Record<number, string>) => {
    setSelectedAnswerSynced(JSON.stringify(answersMap));
    if (question?.article && !revealed) {
      const allFilled = question.article.blanks.every((b) => answersMap[b.id]?.trim());
      if (allFilled) void checkAnswer(question.id);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  if (!question) {
    return <div className="min-h-screen flex items-center justify-center">ไม่พบข้อสอบ</div>;
  }

  return (
    <>
      <TestLayout
        title="สอบจำลองเต็มรูปแบบ"
        durationMinutes={FULL_TEST_TOTAL_SECONDS / 60}
        totalQuestions={FULL_TEST_TOTAL_QUESTIONS}
        currentQuestion={questionIndex}
        answers={progressAnswers}
        onTimeUp={handleTimeUp}
        onNext={handleNextClick}
        onSubmit={handleNextClick}
        onExit={() => { void handleExit(); }}
        sequentialNav
        currentQuestionId={question.id}
        sectionIcon={Trophy}
        sectionColor="from-indigo-500 to-purple-500"
        sectionLabel="Full Mock Exam"
        timerSeconds={timeRemaining > 0 ? timeRemaining : 1}
      >
        {question.testTypeId === 'focus-form' ? (
          <div key={question.id}>
            <FocusFormQuestionCard
              questionText={question.questionText}
              options={[
                { key: 'A', value: question.optionA ?? '' },
                { key: 'B', value: question.optionB ?? '' },
                { key: 'C', value: question.optionC ?? '' },
                { key: 'D', value: question.optionD ?? '' },
              ]}
              selectedAnswer={selectedAnswer}
              correctAnswer={revealed?.mcq ?? null}
              explanation={null}
              conversation={question.conversation ?? null}
              onAnswerSelect={handleMcqSelect}
              disabled={submitting}
            />
          </div>
        ) : (
          <div key={question.id}>
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
                correctAnswer={revealed?.mcq ?? null}
                explanation={null}
                onAnswerSelect={handleMcqSelect}
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
                correctAnswer={selectedAnswer && revealed?.mcq ? ['A','B','C','D'].indexOf(revealed.mcq) : null}
                explanation={''}
                onAnswerSelect={(idx) => handleMcqSelect(['A','B','C','D'][idx])}
              />
            )}

            {question.testTypeId === 'form-meaning' && question.article && (
              <FormMeaningQuiz
                article={question.article}
                onChange={handleClozeChange}
                revealedAnswers={revealed?.blanks ?? null}
              />
            )}
          </div>
        )}
      </TestLayout>

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
    </>
  );
}
