'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { BookOpen, Headphones, Layers, PenTool } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api-fetch';

import type { QuestionResult, Option, Blank } from '@/types/test';
import { usePostHog } from '@/lib/posthog';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import { shuffleQueue } from '@/lib/review-round';
import {
  buildTestSubmissionAnswers,
  countTestSetItems,
  createQuestionChoiceOptions,
  expandTestSetSlots,
  getDisplayedChoiceAnswer,
  getOriginalChoiceAnswer,
  getOriginalTapChoiceAnswer,
  shuffleTapExerciseChoices,
  type ShuffledChoiceOption,
  type TestSetSlot,
  type TapExerciseData,
} from '@/lib/test-set-slots';
import type { PublicTapExerciseData } from '@/lib/test-set-slots';
import dynamic from 'next/dynamic';
import TestExplainOverlay from '@/components/TestExplainOverlay';

const TestLayout = dynamic(() => import('@/components/TestLayout'), {
  loading: () => (
    <div className="min-h-[100dvh] bg-white">
      <div className="bg-white border-b border-slate-200 h-14" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 animate-pulse" style={{ minHeight: '500px' }} />
      </div>
    </div>
  ),
});

const ListeningAudioPlayer = dynamic(() => import('@/components/ListeningAudioPlayer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 md:p-8" style={{ minHeight: '400px' }} />,
});
const TestResults = dynamic(() => import('@/components/TestResults'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 shadow-lg" style={{ minHeight: '400px' }} />,
});
const FocusFormQuestionCard = dynamic(() => import('@/components/FocusFormQuestionCard'));
const FormMeaningQuiz = dynamic(() => import('@/components/FormMeaningQuiz'));
const TestTapSelectCard = dynamic(() => import('@/components/TestTapSelectCard'));

const SECTION_HEADER: Record<string, { icon: React.ElementType; color: string }> = {
  'focus-form': { icon: PenTool, color: 'from-blue-500 to-cyan-500' },
  'focus-meaning': { icon: BookOpen, color: 'from-emerald-500 to-teal-500' },
  'form-meaning': { icon: Layers, color: 'from-purple-500 to-pink-500' },
  'listening': { icon: Headphones, color: 'from-orange-500 to-amber-500' },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawQuestion {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  conversation?: { speaker: string; text: string }[] | null;
  audioUrl?: string | null;
  transcript?: string | null;
  article?: { title: string; text: string; blanks: Blank[] } | null;
  tapExercise?: TapExerciseData | PublicTapExerciseData | null;
  cefrLevel: string;
  difficulty?: string | null;
  grammarTopic?: string | null;
  orderIndex: number;
}

interface SetData {
  id: number;
  sectionId: string;
  name: string;
  description: string | null;
  duration: number | null;
  questions: RawQuestion[];
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <LoadingSpinner text="กำลังโหลดข้อสอบ..." />
    </div>
  );
}


// ─── Main Quiz Page ──────────────────────────────────────────────────────────

export default function SetQuizPage() {
  const router = useRouter();
  const params = useParams<{ sectionId: string; setId: string }>();
  const { status } = useSession();

  const sectionId = params.sectionId;
  const setId = parseInt(params.setId);

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Standard quiz state (MCQ types)
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [tapAnswerCorrectness, setTapAnswerCorrectness] = useState<Record<number, boolean>>({});
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [scoredTotal, setScoredTotal] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [testStartedAt, setTestStartedAt] = useState(() => new Date().toISOString());
  const [formMeaningTotalBlanks, setFormMeaningTotalBlanks] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [testExplain, setTestExplain] = useState<import('@/components/TestExplainOverlay').TestExplainContent | null>(null);
  const [showTestExplain, setShowTestExplain] = useState(false);
  const explainCache = useRef(new Map<string, import('@/components/TestExplainOverlay').TestExplainContent | null>());
  const explainRequestId = useRef(0);

  // Listening state: track per-question whether audio has finished playing
  const [audioPlayedMap, setAudioPlayedMap] = useState<Record<number, boolean>>({});

  // Review Round: two-phase quiz (main → optional review of wrong answers)
  const [phase, setPhase] = useState<'main' | 'review'>('main');
  const [reviewQueue, setReviewQueue] = useState<number[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAnswers, setReviewAnswers] = useState<(string | null)[]>([]);
  const [showReviewIntro, setShowReviewIntro] = useState(false);
  const [introWrongCount, setIntroWrongCount] = useState(0);
  const [checkingReview, setCheckingReview] = useState(false);
  const [reviewableWrongSlots, setReviewableWrongSlots] = useState<number[]>([]);
  const [retryResults, setRetryResults] = useState<Array<{ questionId: number; recovered: boolean }> | null>(null);

  // Set selector dropdown
  const [availableSets, setAvailableSets] = useState<{ id: number; name: string; description?: string | null }[]>([]);
  const mainSlots = useMemo(() => setData ? expandTestSetSlots(setData.questions) : [], [setData]);
  const choiceShuffleSeed = `${setId}-${testStartedAt}`;
  const mainSlot = mainSlots[currentQuestion];
  const explainQuestionIndex = phase === 'review'
    ? (mainSlots[reviewQueue[reviewIndex] ?? 0]?.questionIndex ?? 0)
    : (mainSlot?.questionIndex ?? currentQuestion);
  const explainTopic = setData?.questions[explainQuestionIndex]?.grammarTopic?.trim() ?? '';

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/test-sets?sectionId=${sectionId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAvailableSets(d.data); })
      .catch(() => {});
  }, [status, sectionId]);

  useEffect(() => {
    const requestId = ++explainRequestId.current;
    if (!explainTopic) {
      setTestExplain(null);
      setShowTestExplain(false);
      return;
    }
    const cached = explainCache.current.get(explainTopic);
    if (cached !== undefined) {
      setTestExplain(cached);
      return;
    }
    setTestExplain(null);
    fetch(`/api/test-explains/lookup?topic=${encodeURIComponent(explainTopic)}&setId=${setId}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (requestId !== explainRequestId.current) return;
        const result = payload?.success && payload.data ? payload.data as import('@/components/TestExplainOverlay').TestExplainContent : null;
        explainCache.current.set(explainTopic, result);
        setTestExplain(result);
        // Explain ที่ผูกกับชุดนี้ไว้ (testSetIds) เปิด overlay ให้อัตโนมัติทันที
        // ที่เข้าชุด — ผู้เรียนกดปิดได้ และเปิดใหม่ผ่านปุ่มโหมดทบทวนได้เสมอ
        if (result && payload.auto) setShowTestExplain(true);
      })
      .catch(() => {
        if (requestId === explainRequestId.current) setTestExplain(null);
      });
  }, [explainTopic, setId]);

  useEffect(() => {
    if (!showTestExplain) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTestExplain(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showTestExplain]);

  const setSelectorProps = {
    availableSets,
    currentSetId: setId,
    onSetSelect: (id: number) => router.push(`/tests/${sectionId}/${id}`),
  };

  // PostHog tracking
  const posthog = usePostHog();
  const testStartedAtRef = useRef<number>(0);

  const fetchSet = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-sets/${setId}`);
      const data = await res.json();
      if (data.success) {
        // Keep the authored test-set order so teaching groups remain inserted
        // between the intended exam questions.
        const finalQuestions: RawQuestion[] = data.data.questions;
        setSetData({ ...data.data, questions: finalQuestions });
        setAnswers(Array(countTestSetItems(finalQuestions)).fill(null));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/tests');
      return;
    }
    if (status === 'authenticated' && !isNaN(setId)) {
      fetchSet();
    }
  }, [status, setId, sectionId, router, fetchSet]);

  // Track test_started when questions are loaded
  useEffect(() => {
    if (setData && posthog && testStartedAtRef.current === 0) {
      testStartedAtRef.current = Date.now();
      const levels = setData.questions.map(q => q.cefrLevel).filter(Boolean);
      const levelCounts: Record<string, number> = {};
      levels.forEach(l => { levelCounts[l] = (levelCounts[l] || 0) + 1; });
      const targetLevel = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      posthog.capture('test_started', {
        section_id: sectionId,
        test_set_id: setId,
        test_type: sectionId,
        target_level: targetLevel,
      });
    }
  }, [setData, posthog, sectionId, setId]);

  const isReviewPhase = phase === 'review';

  const getQuestionChoices = useCallback((question: RawQuestion, salt: string): ShuffledChoiceOption[] => createQuestionChoiceOptions(
    [
      { key: 'A', value: question.optionA },
      { key: 'B', value: question.optionB },
      { key: 'C', value: question.optionC },
      { key: 'D', value: question.optionD },
    ],
    `${choiceShuffleSeed}-${question.id}-${salt}`,
    true
  ), [choiceShuffleSeed]);

  const toStoredAnswer = useCallback((question: RawQuestion, slot: TestSetSlot, answer: string): string => {
    if (slot.kind === 'tap') {
      const item = question.tapExercise?.items[slot.itemIndex];
      if (!item) return answer;
      const { answerKeys } = shuffleTapExerciseChoices(item, `${choiceShuffleSeed}-${question.id}-tap-${slot.itemIndex}`);
      return getOriginalTapChoiceAnswer(answer, answerKeys);
    }
    if (slot.kind === 'question') {
      return getOriginalChoiceAnswer(answer, getQuestionChoices(question, `question-${slot.questionIndex}`));
    }
    return answer;
  }, [choiceShuffleSeed, getQuestionChoices]);

  const checkReviewableWrongSlots = useCallback(async () => {
    if (!setData) return [];
    try {
      const response = await apiFetch('/api/tests/review-wrong-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTypeId: sectionId,
          testSetId: setId,
          answers: buildTestSubmissionAnswers(setData.questions, mainSlots, answers, toStoredAnswer),
        }),
      });
      const data = await response.json();
      return data.success && Array.isArray(data.data?.wrongSlots)
        ? data.data.wrongSlots as number[]
        : [];
    } catch {
      // Submission still works if the optional review check is unavailable.
      return [];
    }
  }, [setData, sectionId, setId, mainSlots, answers, toStoredAnswer]);

  // ─── Answer + navigation handlers (phase-aware) ──────────────────

  // Store the picked option for the ACTIVE phase: main round writes into
  // `answers`, review round writes into `reviewAnswers`.
  const handleAnswer = (answer: string) => {
    if (!setData) return;
    const answerSlotIndex = isReviewPhase ? (reviewQueue[reviewIndex] ?? -1) : currentQuestion;
    if (answerSlotIndex < 0) return;

    if (isReviewPhase) {
      if (reviewAnswers[reviewIndex] !== null) return;
      const next = [...reviewAnswers];
      next[reviewIndex] = answer;
      setReviewAnswers(next);
    } else {
      if (selectedAnswer !== null) return;
      const next = [...answers];
      next[currentQuestion] = answer;
      setAnswers(next);
    }
    setSelectedAnswer(answer);

    const slot = mainSlots[answerSlotIndex];
    if (slot?.kind !== 'tap') return;
    const question = setData.questions[slot.questionIndex];
    const item = question.tapExercise?.items[slot.itemIndex];
    if (!item) return;

    const { answerKeys } = shuffleTapExerciseChoices(
      item,
      `${choiceShuffleSeed}-${question.id}-tap-${slot.itemIndex}`,
    );
    void apiFetch('/api/tests/tap-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testSetId: setId,
        questionId: question.id,
        itemIndex: slot.itemIndex,
        selectedAnswer: getOriginalTapChoiceAnswer(answer, answerKeys),
      }),
    })
      .then(response => response.json())
      .then(result => {
        if (result.success && typeof result.data?.isCorrect === 'boolean') {
          setTapAnswerCorrectness(current => ({ ...current, [answerSlotIndex]: result.data.isCorrect }));
        }
      })
      .catch(() => {
        // Keep the selected option neutral if server-side answer checking fails.
      });
  };

  // Layout index → phase-correct slot. In review phase, layout indices are
  // offset by the main round length.
  const handleFreeTextAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    if (isReviewPhase) {
      setReviewAnswers(previous => previous.map((value, index) => index === reviewIndex ? answer : value));
      return;
    }
    setAnswers(previous => previous.map((value, index) => index === currentQuestion ? answer : value));
  };

  const handleResetAnswer = (index: number) => {
    if (isReviewPhase) {
      const rIdx = index - answers.length;
      if (rIdx < 0 || rIdx >= reviewQueue.length) return;
      const reviewNext = [...reviewAnswers];
      reviewNext[rIdx] = null;
      setReviewAnswers(reviewNext);
      const slotIndex = reviewQueue[rIdx];
      setTapAnswerCorrectness(current => {
        const next = { ...current };
        delete next[slotIndex];
        return next;
      });
      if (rIdx === reviewIndex) setSelectedAnswer(null);
      return;
    }
    const newAnswers = [...answers];
    newAnswers[index] = null;
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setTapAnswerCorrectness(current => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const handleQuestionSelect = (index: number) => {
    if (isReviewPhase) {
      if (index < answers.length) return;
      const rIdx = index - answers.length;
      if (rIdx >= reviewQueue.length) return;
      setReviewIndex(rIdx);
      setSelectedAnswer(reviewAnswers[rIdx]);
      return;
    }
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]);
    if (answers[index] !== null && !audioPlayedMap[index]) {
      setAudioPlayedMap(prev => ({ ...prev, [index]: true }));
    }
  };

  const handlePrevious = () => {
    if (isReviewPhase) {
      if (reviewIndex > 0) {
        setReviewIndex(reviewIndex - 1);
        setSelectedAnswer(reviewAnswers[reviewIndex - 1]);
      }
      return;
    }
    if (currentQuestion > 0) {
      const prev = currentQuestion - 1;
      setCurrentQuestion(prev);
      setSelectedAnswer(answers[prev]);
      if (answers[prev] !== null && !audioPlayedMap[prev]) {
        setAudioPlayedMap(map => ({ ...map, [prev]: true }));
      }
    }
  };

  const handleNext = () => {
    if (!setData) return;
    if (isReviewPhase) {
      if (reviewIndex < reviewQueue.length - 1) {
        setReviewIndex(reviewIndex + 1);
        setSelectedAnswer(reviewAnswers[reviewIndex + 1]);
      }
      return;
    }
    if (currentQuestion < mainSlots.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      setSelectedAnswer(answers[next]);
      if (answers[next] !== null && !audioPlayedMap[next]) {
        setAudioPlayedMap(prev => ({ ...prev, [next]: true }));
      }
    }
  };

  type RetryPayload = { questionId: number; selectedAnswer: string };

  // Collect review-round answers as the submit payload. Unanswered retries
  // are dropped (treated as "did not retry").
  const buildRetriesPayload = (): RetryPayload[] => {
    if (!setData) return [];
    return reviewQueue
      .map((slotIndex, rIdx) => {
        const slot = mainSlots[slotIndex];
        const answer = reviewAnswers[rIdx] ?? '';
        const question = setData.questions[slot.questionIndex];
        const storedAnswer = toStoredAnswer(question, slot, answer);
        return {
          questionId: question.id,
          selectedAnswer: slot.kind === 'tap'
            ? JSON.stringify({ [slot.itemIndex]: storedAnswer })
            : slot.kind === 'article'
              ? JSON.stringify({ [slot.blankId]: storedAnswer })
              : storedAnswer,
        };
      })
      .filter((r): r is RetryPayload => r.selectedAnswer !== null);
  };

  const executeSubmit = async (retriesPayload: RetryPayload[] = []) => {
    if (!setData || submitting) return; // Guard: prevent double submit
    setSubmitting(true);
    setShowSubmitConfirm(false);
    try {
      const res = await apiFetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTypeId: sectionId,
          testSetId: setId,
          startedAt: testStartedAt,
          answers: buildTestSubmissionAnswers(setData.questions, mainSlots, answers, toStoredAnswer),
          retries: retriesPayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScore(data.data.correctAnswers);
        setScoredTotal(data.data.totalQuestions ?? setData.questions.length);
        setResults(data.data.results ?? []);
        setAttemptId(data.data.attemptId ?? null);
        setRetryResults(data.data.retryResults ?? null);
        setIsFinished(true);
        // Track test_submitted
        if (posthog && testStartedAtRef.current > 0) {
          const totalQuestions = data.data.totalQuestions ?? mainSlots.length;
          const wrongIds = (data.data.results ?? [])
            .filter((r: { isCorrect: boolean }) => !r.isCorrect)
            .map((r: { questionId: number }) => r.questionId);
          const retryList = (data.data.retryResults ?? []) as Array<{ recovered: boolean }>;
          const recoveredCount = retryList.filter((r) => r.recovered).length;
          const scorePct = Math.round((data.data.correctAnswers / totalQuestions) * 100);
          posthog.capture('test_submitted', {
            section_id: sectionId,
            test_set_id: setId,
            score: data.data.correctAnswers,
            total_questions: totalQuestions,
            time_spent_seconds: Math.floor((Date.now() - testStartedAtRef.current) / 1000),
            wrong_question_ids: wrongIds,
            review_round_count: retryList.length,
            recovered_count: recoveredCount,
            score_percentage: scorePct,
          });
          fetch('/api/progress')
            .then(r => r.json())
            .then(progress => {
              if (progress.success && progress.data?.overall?.averageScore != null) {
                posthog.people.set({ cefr_level: estimateCefrLevel(progress.data.overall.averageScore) });
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const secs = err.message.split(':')[1] || '60';
        toast.error(`ระบบทำงานช้า กรุณารอ ${secs} วินาทีแล้วลองใหม่`);
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Submit entry point for BOTH phases:
  // - main + force (timer) → submit immediately, review round skipped
  // - main + has wrong answers → offer the review round first
  // - main + no wrong answers → submit as before
  // - review → confirm then submit with collected retries
  const handleSubmit = async (force = false) => {
    if (!setData || submitting || checkingReview) return;

    if (phase === 'review') {
      const unansweredRetries = reviewAnswers.filter((a) => a === null).length;
      if (!force && unansweredRetries > 0) {
        setUnansweredCount(unansweredRetries);
        setShowSubmitConfirm(true);
        return;
      }
      executeSubmit(buildRetriesPayload());
      return;
    }

    const unanswered = answers.filter((a) => a === null).length;

    if (!force && unanswered > 0) {
      setUnansweredCount(unanswered);
      setShowSubmitConfirm(true);
    } else if (force) {
      executeSubmit();
    } else {
      setCheckingReview(true);
      try {
        const wrongSet = await checkReviewableWrongSlots();
        setReviewableWrongSlots(wrongSet);
        if (wrongSet.length > 0) {
          setIntroWrongCount(wrongSet.length);
          setShowReviewIntro(true);
          return;
        }
        executeSubmit();
      } finally {
        setCheckingReview(false);
      }
    }
  };

  const handleTimeUp = () => {
    void handleSubmit(true);
  };

  // Leave the main round behind and start the shuffled retry queue.
  const enterReviewRound = () => {
    if (!setData) return;
    const wrongSet = shuffleQueue(reviewableWrongSlots);
    setReviewQueue(wrongSet);
    setReviewAnswers(Array(wrongSet.length).fill(null));
    setReviewIndex(0);
    setSelectedAnswer(null);
    setShowReviewIntro(false);
    setPhase('review');
  };

  // ─── Render guards ────────────────────────────────────────────────

  if (loading || status === 'loading') return <Spinner />;

  if (submitting && !isFinished) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !setData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 text-lg font-medium">Test set not found.</p>
        <Link href={`/tests/${sectionId}`} className="mt-4 inline-block text-primary-600 hover:underline">
          ← Back to sets
        </Link>
      </div>
    );
  }

  const currentSetIndex = availableSets.findIndex((s) => s.id === setId);
  const nextSet = currentSetIndex >= 0 && currentSetIndex < availableSets.length - 1
    ? availableSets[currentSetIndex + 1]
    : null;
  const nextSetProps = nextSet
    ? {
        nextSetLabel: `ทำชุด ${currentSetIndex + 2}`,
        onNextSet: () => router.push(`/tests/${sectionId}/${nextSet.id}`),
      }
    : {};

  const handleRestartTest = () => {
    const restartedAt = new Date().toISOString();
    setTestStartedAt(restartedAt);
    setScore(0);
    setScoredTotal(null);
    setAnswers(Array(mainSlots.length).fill(null));
    setSelectedAnswer(null);
    setCurrentQuestion(0);
    setAttemptId(null);
    setFormMeaningTotalBlanks(0);
    setAudioPlayedMap({});
    setIsFinished(false);
    // Review Round state reset
    setPhase('main');
    setReviewQueue([]);
    setReviewIndex(0);
    setReviewAnswers([]);
    setReviewableWrongSlots([]);
    setShowReviewIntro(false);
    setRetryResults(null);
    setTapAnswerCorrectness({});
  };

  // form-meaning uses its own special renderer when all entries are articles.
  // Mixed Tap & Select sets use the common per-slot test flow below.
  if (sectionId === 'form-meaning' && !setData.questions.some(q => q.tapExercise?.items.length)) {
    if (isFinished) {
      return (
        <TestResults
          score={score}
          totalQuestions={formMeaningTotalBlanks}
          attemptId={attemptId}
          onRestart={handleRestartTest}
          sectionIcon={(SECTION_HEADER[sectionId] ?? SECTION_HEADER['focus-form']).icon}
          sectionColor={(SECTION_HEADER[sectionId] ?? SECTION_HEADER['focus-form']).color}
          headerTitle={setData.name}
          durationMinutes={setData.duration ?? undefined}
          setNumber={currentSetIndex >= 0 ? currentSetIndex + 1 : 1}
          {...nextSetProps}
        />
      );
    }
    return (
      <>
      <FormMeaningQuiz
        questions={setData.questions}
        reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: () => setShowTestExplain(true) } : undefined}
        sectionId={sectionId}
        setId={setId}
        setName={setData.name}
        availableSets={availableSets}
        onSetSelect={(id) => router.push(`/tests/${sectionId}/${id}`)}
        onFinish={(s, total) => { setScore(s); setFormMeaningTotalBlanks(total); setIsFinished(true); }}
        onAttemptId={(id) => setAttemptId(id)}
      />
      <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
      </>
    );
  }

  if (isFinished) {
    return (
      <TestResults
        score={score}
        totalQuestions={scoredTotal ?? mainSlots.length}
        attemptId={attemptId}
        onRestart={handleRestartTest}
        retryResults={retryResults ?? undefined}
        sectionIcon={(SECTION_HEADER[sectionId] ?? SECTION_HEADER['focus-form']).icon}
        sectionColor={(SECTION_HEADER[sectionId] ?? SECTION_HEADER['focus-form']).color}
        headerTitle={setData.name}
        durationMinutes={setData.duration ?? undefined}
        setNumber={currentSetIndex >= 0 ? currentSetIndex + 1 : 1}
        {...nextSetProps}
      />
    );
  }

  // Layout positions are virtual item slots. Tap & Select groups expand to
  // one slot per item, so navigation and answer progress stay item-granular.
  const activeSlotIndex = isReviewPhase ? (reviewQueue[reviewIndex] ?? 0) : currentQuestion;
  const activeSlot: TestSetSlot | undefined = mainSlots[activeSlotIndex];
  const question = setData.questions[activeSlot?.questionIndex ?? 0];
  if (!question || !activeSlot) return <Spinner />;
  const tapItem = activeSlot.kind === 'tap' ? question.tapExercise?.items[activeSlot.itemIndex] : undefined;
  const tapDisplay = tapItem && activeSlot.kind === 'tap'
    ? shuffleTapExerciseChoices(tapItem, `${choiceShuffleSeed}-${question.id}-tap-${activeSlot.itemIndex}`)
    : null;
  const questionChoices = activeSlot.kind === 'question'
    ? getQuestionChoices(question, `question-${activeSlot.questionIndex}`)
    : [];
  const displayedCorrectAnswer = getDisplayedChoiceAnswer(question.correctAnswer ?? null, questionChoices);
  const articleBlank = activeSlot.kind === 'article' ? question.article?.blanks.find(blank => blank.id === activeSlot.blankId) : undefined;

  const layoutTotal = isReviewPhase ? answers.length + reviewQueue.length : mainSlots.length;
  const layoutCurrent = isReviewPhase ? answers.length + reviewIndex : currentQuestion;
  const layoutAnswers = isReviewPhase ? [...answers, ...reviewAnswers] : answers;

  // Shared modals — hoisted so every section branch renders them.
  const modalsFragment = (
    <>
      <ConfirmModal
        isOpen={showSubmitConfirm}
        title="ยังทำข้อสอบไม่ครบ"
        description={`มีคำถามที่ยังไม่ได้ตอบอีก ${unansweredCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`}
        confirmLabel="ส่งคำตอบ"
        cancelLabel="ทำต่อ"
        type="warning"
        onConfirm={() => handleSubmit(true)}
        onCancel={() => setShowSubmitConfirm(false)}
      />
      <ConfirmModal
        isOpen={showReviewIntro}
        title="จบรอบแรก!"
        description={`คุณตอบผิด ${introWrongCount} ข้อ — เข้ารอบทบทวนเพื่อลองทำใหม่ไหม? (คะแนนนับรอบแรกเท่านั้น)`}
        confirmLabel="เข้ารอบทบทวน"
        cancelLabel="ส่งคำตอบเลย"
        type="info"
        onConfirm={enterReviewRound}
        onCancel={() => {
          setShowReviewIntro(false);
          executeSubmit();
        }}
      />
    </>
  );

  // ─── Mixed form-meaning blank slot ────────────────────────────────
  if (articleBlank && activeSlot?.kind === 'article') {
    const articleText = question.article?.text ?? '';
    const readableText = question.article?.blanks.reduce(
      (text, blank) => text.replaceAll(`{{${blank.id}}}`, '_____'),
      articleText
    ) ?? articleText;
    return (
      <TestLayout
        title={setData.name}
        {...setSelectorProps}
        durationMinutes={setData.duration ?? undefined}
        totalQuestions={layoutTotal}
        currentQuestion={layoutCurrent}
        answers={layoutAnswers}
        onQuestionSelect={handleQuestionSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={() => handleSubmit()}
        onTimeUp={handleTimeUp}
        currentQuestionId={question.id}
        onResetAnswer={handleResetAnswer}
        phaseLabel={isReviewPhase ? 'รอบทบทวน' : undefined}
        reviewSegmentStart={isReviewPhase ? answers.length : undefined}
      >
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-slate-800">{question.article?.title || question.questionText}</h2>
          <p className="whitespace-pre-line text-base leading-8 text-slate-700">{readableText}</p>
          <label className="block text-sm font-semibold text-slate-700">
            ข้อ {activeSlot.blankId}: เติมคำตอบ
            <input
              value={selectedAnswer ?? ''}
              onChange={event => handleFreeTextAnswer(event.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-blue-400 focus:outline-none"
              placeholder={articleBlank.hint || 'พิมพ์คำตอบ'}
            />
          </label>
        </div>
        {modalsFragment}
      </TestLayout>
    );
  }

  // ─── Tap & Select item ───────────────────────────────────────────
  if (tapItem) {
    return (
      <>
        <TestLayout
          title={setData.name}
          {...setSelectorProps}
          durationMinutes={setData.duration ?? undefined}
          totalQuestions={layoutTotal}
          currentQuestion={layoutCurrent}
          answers={layoutAnswers}
          onQuestionSelect={handleQuestionSelect}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={() => handleSubmit()}
          onTimeUp={handleTimeUp}
          currentQuestionId={question.id}
          onResetAnswer={handleResetAnswer}
        >
          <TestTapSelectCard
            key={`${question.id}-${activeSlot.kind === 'tap' ? activeSlot.itemIndex : ''}`}
            title={question.tapExercise?.title ?? question.questionText}
            hint={question.tapExercise?.hint}
            item={tapDisplay?.item ?? tapItem!}
            itemIndex={activeSlot.kind === 'tap' ? activeSlot.itemIndex : 0}
            selectedAnswer={selectedAnswer}
            onAnswer={handleAnswer}
            answerIsCorrect={tapAnswerCorrectness[activeSlotIndex] ?? null}
            disabled={submitting}
          />
          {modalsFragment}
        </TestLayout>
      </>
    );
  }

  // ─── Listening ───────────────────────────────────────────────────
  if (sectionId === 'listening') {
    return (
      <>
      <TestLayout
        title={setData.name}
        {...setSelectorProps}
        durationMinutes={setData.duration ?? undefined}
        totalQuestions={layoutTotal}
        currentQuestion={layoutCurrent}
        answers={layoutAnswers}
        onQuestionSelect={handleQuestionSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={() => handleSubmit()}
        onTimeUp={handleTimeUp}
        phaseLabel={isReviewPhase ? 'รอบทบทวน' : undefined}
        reviewSegmentStart={isReviewPhase ? answers.length : undefined}
        currentQuestionId={question.id}
        sectionIcon={Headphones}
        sectionColor="from-orange-500 to-amber-500"
        sectionLabel="Listening"
        onResetAnswer={handleResetAnswer}
        reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: () => setShowTestExplain(true) } : undefined}
      >
        <ListeningAudioPlayer
          key={isReviewPhase ? `${question.id}-review` : question.id}
          audioUrl={question.audioUrl ?? undefined}
          transcript={question.transcript ?? question.questionText}
          questionText={question.questionText}
          options={questionChoices}
          selectedAnswer={selectedAnswer}
          correctAnswer={selectedAnswer !== null ? displayedCorrectAnswer : null}
          explanation={selectedAnswer !== null ? (question.explanation || 'See transcript above.') : null}
          onAudioPlayed={() => setAudioPlayedMap(prev => ({ ...prev, [currentQuestion]: true }))}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
        />
        {modalsFragment}
      </TestLayout>
      <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
      </>
    );
  }

  // ─── Focus Meaning ────────────────────────────────────────────────
  if (sectionId === 'focus-meaning') {
    return (
      <>
      <TestLayout
        title={setData.name}
        {...setSelectorProps}
        durationMinutes={setData.duration ?? undefined}
        totalQuestions={layoutTotal}
        currentQuestion={layoutCurrent}
        answers={layoutAnswers}
        onQuestionSelect={handleQuestionSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={() => handleSubmit()}
        onTimeUp={handleTimeUp}
        phaseLabel={isReviewPhase ? 'รอบทบทวน' : undefined}
        reviewSegmentStart={isReviewPhase ? answers.length : undefined}
        currentQuestionId={question.id}
        sectionIcon={BookOpen}
        sectionColor="from-emerald-500 to-teal-500"
        onResetAnswer={handleResetAnswer}
        reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: () => setShowTestExplain(true) } : undefined}
      >
      <FocusFormQuestionCard
          key={isReviewPhase ? `${question.id}-review` : question.id}
          questionText={question.questionText}
          options={questionChoices}
          selectedAnswer={selectedAnswer}
          correctAnswer={displayedCorrectAnswer}
          explanation={question.explanation ?? null}
          conversation={question.conversation ?? null}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
          accent="emerald"
          headerIcon={BookOpen}
          headerLabel="Conversation"
        />
        {modalsFragment}
      </TestLayout>
      <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
      </>
    );
  }

  // ─── Focus Form (default MCQ) ─────────────────────────────────────
  const options: Option[] = questionChoices;
  const correctAnswer = displayedCorrectAnswer ?? results[currentQuestion]?.correctAnswer ?? null;
  const explanation = question.explanation ?? results[currentQuestion]?.explanation ?? null;

  return (
    <>
    <TestLayout
      title={setData.name}
      {...setSelectorProps}
      durationMinutes={setData.duration ?? undefined}
      totalQuestions={layoutTotal}
      currentQuestion={layoutCurrent}
      answers={layoutAnswers}
      onQuestionSelect={handleQuestionSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={() => handleSubmit()}
      onTimeUp={handleTimeUp}
      phaseLabel={isReviewPhase ? 'รอบทบทวน' : undefined}
      reviewSegmentStart={isReviewPhase ? answers.length : undefined}
      currentQuestionId={question.id}
      onResetAnswer={handleResetAnswer}
      reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: () => setShowTestExplain(true) } : undefined}
    >
      <FocusFormQuestionCard
        key={isReviewPhase ? `${question.id}-review` : question.id}
        questionText={question.questionText}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={correctAnswer}
        explanation={explanation}
        conversation={question.conversation ?? null}
        onAnswerSelect={handleAnswer}
        disabled={submitting}
      />
      {modalsFragment}
    </TestLayout>
    <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
    </>
  );
}

