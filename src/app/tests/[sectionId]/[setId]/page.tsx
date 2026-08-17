'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FileText, ChevronRight, Clock, BookOpen, Headphones, Layers, LogOut, PenTool } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api-fetch';

import type { QuestionResult, Option, Blank } from '@/types/test';
import { usePostHog } from '@/lib/posthog';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import dynamic from 'next/dynamic';

const TestLayout = dynamic(() => import('@/components/TestLayout'), {
  loading: () => (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100">
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
const SelectableText = dynamic(() => import('@/components/SelectableText'));
const FocusFormQuestionCard = dynamic(() => import('@/components/FocusFormQuestionCard'));

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
  cefrLevel: string;
  difficulty?: string | null;
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

// ─── Form-Meaning inline article renderer ───────────────────────────────────

function FormMeaningQuiz({
  questions,
  sectionId,
  setId,
  setName,
  onFinish,
  onAttemptId,
}: {
  questions: RawQuestion[];
  sectionId: string;
  setId: number;
  setName: string;
  onFinish: (score: number, totalBlanks: number) => void;
  onAttemptId?: (id: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [testStartedAt] = useState(() => new Date().toISOString());
  const router = useRouter();

  // Combine all articles into one, re-numbering blanks globally
  const combinedArticle = useMemo(() => {
    const allBlanks: Blank[] = [];
    let combinedText = '';
    let globalBlankId = 1;
    questions.forEach((q, index) => {
      if (q.article) {
        let text = q.article.text;
        q.article.blanks.forEach((blank) => {
          const oldPh = `{{${blank.id}}}`;
          const newPh = `{{${globalBlankId}}}`;
          text = text.replace(oldPh, newPh);
          allBlanks.push({ id: globalBlankId, correctAnswer: blank.correctAnswer, hint: blank.hint });
          globalBlankId++;
        });
        if (index > 0) combinedText += ' ';
        combinedText += text;
      }
    });
    return { title: setName, text: combinedText, blanks: allBlanks };
  }, [questions, setName]);

  const globalToOriginal = useMemo(() => {
    const map = new Map<number, { questionId: number; originalBlankId: number }>();
    let globalBlankId = 1;
    questions.forEach((q) => {
      if (q.article) {
        q.article.blanks.forEach((blank) => {
          map.set(globalBlankId, { questionId: q.id, originalBlankId: blank.id });
          globalBlankId++;
        });
      }
    });
    return map;
  }, [questions]);

  const totalBlanks = combinedArticle.blanks.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[parseInt(k)]).length;

  const executeSubmit = async () => {
    if (submitting) return; // Guard: prevent double submit
    setSubmitting(true);
    setShowSubmitConfirm(false);
    try {
      // Calculate score client-side: compare each blank answer against correct answer
      const localCorrectCount = combinedArticle.blanks.filter(
        (b) => answers[b.id]?.toLowerCase() === b.correctAnswer.toLowerCase()
      ).length;

      // Build per-question blank answers as JSON (using original blank IDs)
      const questionBlankAnswers = new Map<number, Record<number, string>>();
      Object.entries(answers).forEach(([globalBlankIdStr, answer]) => {
        const mapping = globalToOriginal.get(parseInt(globalBlankIdStr));
        if (mapping && answer) {
          if (!questionBlankAnswers.has(mapping.questionId)) {
            questionBlankAnswers.set(mapping.questionId, {});
          }
          questionBlankAnswers.get(mapping.questionId)![mapping.originalBlankId] = answer;
        }
      });

      const res = await apiFetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTypeId: sectionId,
          testSetId: setId,
          startedAt: testStartedAt,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedAnswer: questionBlankAnswers.has(q.id)
              ? JSON.stringify(questionBlankAnswers.get(q.id))
              : '',
          })),
        }),
      });
      const data = await res.json();

      const serverCorrect = data.success ? data.data.correctAnswers : localCorrectCount;
      if (data.success && data.data.attemptId) {
        onAttemptId?.(data.data.attemptId);
      }
      setIsSubmitted(true);
      setCorrectCount(serverCorrect);
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

  const handleSubmit = () => {
    if (submitting) return; // Guard: prevent double submit
    const unanswered = totalBlanks - answeredCount;

    if (unanswered > 0) {
      setShowSubmitConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const renderArticle = () => {
    let text = combinedArticle.text;
    const parts: React.ReactNode[] = [];
    let key = 0;
    combinedArticle.blanks.forEach((blank) => {
      const ph = `{{${blank.id}}}`;
      const idx = text.indexOf(ph);
      if (idx !== -1) {
        parts.push(
          <span key={key++}>
            <SelectableText text={text.substring(0, idx)} contextSentence={combinedArticle.text} inline={true} />
          </span>
        );
        const isCorrect = isSubmitted && answers[blank.id]?.toLowerCase() === blank.correctAnswer.toLowerCase();
        const isWrong = isSubmitted && !isCorrect && answers[blank.id];
        const isEmpty = isSubmitted && !answers[blank.id];
        parts.push(
          <span key={key++} className="inline-flex flex-col items-start mx-1">
            <input
              type="text"
              className={`w-32 px-2 py-1 rounded border-2 text-center ${isSubmitted
                ? isCorrect
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700 line-through'
                    : isEmpty
                      ? 'border-amber-400 bg-amber-50 text-amber-600'
                      : 'border-slate-300 bg-slate-50'
                : 'border-purple-300 focus:border-purple-500 focus:outline-none'
                }`}
              placeholder={blank.hint?.split(' - ')[0] || 'Answer'}
              value={answers[blank.id] || ''}
              onChange={(e) =>
                !isSubmitted && setAnswers((prev) => ({ ...prev, [blank.id]: e.target.value.toLowerCase().trim() }))
              }
              disabled={isSubmitted || submitting}
            />
            {isSubmitted && isWrong && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  <SelectableText text={blank.correctAnswer} contextSentence={blank.correctAnswer} />
                </span>
              </span>
            )}
            {isSubmitted && isEmpty && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                  Answer: <SelectableText text={blank.correctAnswer} contextSentence={blank.correctAnswer} />
                </span>
              </span>
            )}
          </span>
        );
        text = text.substring(idx + ph.length);
      }
    });
    parts.push(
      <span key={key}>
        <SelectableText text={text} contextSentence={combinedArticle.text} inline={true} />
      </span>
    );
    return parts;
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${totalBlanks > 0 ? (answeredCount / totalBlanks) * 100 : 0}%` }}
        />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-[0_1px_6.4px_0_rgba(221,221,221,0.25)] shrink-0 z-40 pt-1 sticky top-0">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-0 md:h-[6.6875rem] h-[90px]">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-[1.375rem] text-[#5A6387] line-clamp-1">{setName}</h1>
                <div className="flex items-center gap-2 text-xs sm:text-[1rem] text-[#5A6387] font-medium">
                  <span>set 1 - {totalBlanks} ข้อ</span>
                  <span>|</span>
                  <span>15 min</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-[#616161] text-sm sm:text-[1.125rem] rounded-lg font-semibold flex items-center shrink-0"
              aria-label="จบการสอบ"
            >
              <span className="hidden sm:inline">จบการสอบ</span>
              <LogOut className="w-5 h-5 text-slate-600 sm:ms-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Blank {answeredCount} of {totalBlanks}</span>
            <span>{totalBlanks > 0 ? Math.round((answeredCount / totalBlanks) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${totalBlanks > 0 ? (answeredCount / totalBlanks) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            <SelectableText text={combinedArticle.title} contextSentence={combinedArticle.title} />
          </h2>
          <div className="text-lg text-slate-700 leading-relaxed">{renderArticle()}</div>
        </div>

        {isSubmitted && (
          <div className={`p-4 rounded-xl mb-6 ${correctCount === totalBlanks
            ? 'bg-emerald-50 border border-emerald-200'
            : correctCount >= totalBlanks * 0.7
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-red-50 border border-red-200'
            }`}>
            <p className="font-medium text-slate-800 mb-1">
              Score: {correctCount} out of {totalBlanks}
            </p>
            <p className="text-sm text-slate-600">
              {correctCount === totalBlanks
                ? 'Perfect! All blanks filled correctly.'
                : 'Review your answers above — wrong blanks are highlighted in red with the correct answer shown below.'}
            </p>
          </div>
        )}

        {/* Desktop: Submit Button (above mobile bar) */}
        {!isSubmitted && (
          <div className="hidden md:flex justify-end mt-8">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answers
            </button>
          </div>
        )}

        {isSubmitted && (
          <div className="hidden md:flex justify-end mt-4">
            <button
              onClick={() => onFinish(correctCount, totalBlanks)}
              className="btn-primary inline-flex items-center gap-2"
            >
              View Results
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Submit Bar - Only ONE button */}
      {!isSubmitted && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        </div>
      )}

      {isSubmitted && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3">
          <button
            onClick={() => onFinish(correctCount, totalBlanks)}
            className="w-full btn-primary py-3"
          >
            View Results
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showSubmitConfirm}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={executeSubmit}
        title="ยืนยันการส่งคำตอบ"
        description="คุณยังมีคำถามที่ยังไม่ได้ตอบ คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบ?"
        confirmLabel="ส่งคำตอบ"
      />

      <ConfirmModal
        isOpen={showExitConfirm}
        title="ยกเลิกการสอบ"
        description="คำตอบทั้งหมดจะไม่ถูกบันทึก ต้องการยกเลิกการสอบหรือไม่?"
        confirmLabel="ยกเลิกการสอบ"
        cancelLabel="ทำต่อ"
        type="warning"
        onConfirm={() => router.push(`/tests/${sectionId}`)}
        onCancel={() => setShowExitConfirm(false)}
      />
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
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [testStartedAt] = useState(() => new Date().toISOString());
  const [formMeaningTotalBlanks, setFormMeaningTotalBlanks] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  // Listening state: track per-question whether audio has finished playing
  const [audioPlayedMap, setAudioPlayedMap] = useState<Record<number, boolean>>({});

  // Set selector dropdown
  const [availableSets, setAvailableSets] = useState<{ id: number; name: string; description?: string | null }[]>([]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/test-sets?sectionId=${sectionId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAvailableSets(d.data); })
      .catch(() => {});
  }, [status, sectionId]);

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
        let finalQuestions = data.data.questions;

        // Shuffle questions for sections that don't depend on sequential order
        if (sectionId !== 'form-meaning') {
          finalQuestions = [...finalQuestions];
          for (let i = finalQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
          }
        }

        setSetData({ ...data.data, questions: finalQuestions });
        setAnswers(Array(finalQuestions.length).fill(null));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [setId, sectionId]);

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

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const handleResetAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = null;
    setAnswers(newAnswers);
    setSelectedAnswer(null);
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]);
    if (answers[index] !== null && !audioPlayedMap[index]) {
      setAudioPlayedMap(prev => ({ ...prev, [index]: true }));
    }
  };

  const handlePrevious = () => {
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
    if (currentQuestion < setData.questions.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      setSelectedAnswer(answers[next]);
      if (answers[next] !== null && !audioPlayedMap[next]) {
        setAudioPlayedMap(prev => ({ ...prev, [next]: true }));
      }
    }
  };

  const executeSubmit = async () => {
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
          answers: setData.questions.map((q, i) => ({
            questionId: q.id,
            selectedAnswer: answers[i] || '',
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScore(data.data.correctAnswers);
        setResults(data.data.results ?? []);
        setAttemptId(data.data.attemptId ?? null);
        setIsFinished(true);
        // Track test_submitted
        if (posthog && testStartedAtRef.current > 0) {
          const totalQuestions = data.data.results?.length ?? setData.questions.length;
          const wrongIds = (data.data.results ?? [])
            .filter((r: { isCorrect: boolean }) => !r.isCorrect)
            .map((r: { questionId: number }) => r.questionId);
          const scorePct = Math.round((data.data.correctAnswers / totalQuestions) * 100);
          posthog.capture('test_submitted', {
            section_id: sectionId,
            test_set_id: setId,
            score: data.data.correctAnswers,
            total_questions: totalQuestions,
            time_spent_seconds: Math.floor((Date.now() - testStartedAtRef.current) / 1000),
            wrong_question_ids: wrongIds,
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

  const handleSubmit = (force = false) => {
    if (!setData || submitting) return;
    const unanswered = answers.filter((a) => a === null).length;

    if (!force && unanswered > 0) {
      setUnansweredCount(unanswered);
      setShowSubmitConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const handleTimeUp = () => {
    handleSubmit(true);
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
    setScore(0);
    setAnswers(Array(setData.questions.length).fill(null));
    setSelectedAnswer(null);
    setCurrentQuestion(0);
    setAttemptId(null);
    setFormMeaningTotalBlanks(0);
    setAudioPlayedMap({});
    setIsFinished(false);
  };

  // form-meaning uses its own special renderer
  if (sectionId === 'form-meaning') {
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
      <FormMeaningQuiz
        questions={setData.questions}
        sectionId={sectionId}
        setId={setId}
        setName={setData.name}
        onFinish={(s, total) => { setScore(s); setFormMeaningTotalBlanks(total); setIsFinished(true); }}
        onAttemptId={(id) => setAttemptId(id)}
      />
    );
  }

  if (isFinished) {
    return (
      <TestResults
        score={score}
        totalQuestions={setData.questions.length}
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

  const question = setData.questions[currentQuestion];
  if (!question) return <Spinner />;

  // ─── Listening ───────────────────────────────────────────────────
  if (sectionId === 'listening') {
    return (
      <TestLayout
        title={setData.name}
        {...setSelectorProps}
        durationMinutes={setData.duration ?? undefined}
        totalQuestions={setData.questions.length}
        currentQuestion={currentQuestion}
        answers={answers}
        onQuestionSelect={handleQuestionSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={() => handleSubmit()}
        onTimeUp={handleTimeUp}
        currentQuestionId={question.id}
        sectionIcon={Headphones}
        sectionColor="from-orange-500 to-amber-500"
        sectionLabel="Listening"
        onResetAnswer={handleResetAnswer}
      >
        <ListeningAudioPlayer
          key={question.id}
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
          correctAnswer={selectedAnswer !== null ? (question.correctAnswer ?? null) : null}
          explanation={selectedAnswer !== null ? (question.explanation || 'See transcript above.') : null}
          onAudioPlayed={() => setAudioPlayedMap(prev => ({ ...prev, [currentQuestion]: true }))}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
        />
      </TestLayout>
    );
  }

  // ─── Focus Meaning ────────────────────────────────────────────────
  if (sectionId === 'focus-meaning') {
    return (
      <TestLayout
        title={setData.name}
        {...setSelectorProps}
        durationMinutes={setData.duration ?? undefined}
        totalQuestions={setData.questions.length}
        currentQuestion={currentQuestion}
        answers={answers}
        onQuestionSelect={handleQuestionSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={() => handleSubmit()}
        onTimeUp={handleTimeUp}
        currentQuestionId={question.id}
        sectionIcon={BookOpen}
        sectionColor="from-emerald-500 to-teal-500"
        onResetAnswer={handleResetAnswer}
      >
        <FocusFormQuestionCard
          key={question.id}
          questionText={question.questionText}
          options={[
            { key: 'A', value: question.optionA ?? '' },
            { key: 'B', value: question.optionB ?? '' },
            { key: 'C', value: question.optionC ?? '' },
            { key: 'D', value: question.optionD ?? '' },
          ]}
          selectedAnswer={selectedAnswer}
          correctAnswer={question.correctAnswer ?? null}
          explanation={question.explanation ?? null}
          conversation={question.conversation ?? null}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
          accent="emerald"
          headerIcon={BookOpen}
          headerLabel="Conversation"
        />
      </TestLayout>
    );
  }

  // ─── Focus Form (default MCQ) ─────────────────────────────────────
  const options: Option[] = [
    { key: 'A', value: question.optionA ?? '' },
    { key: 'B', value: question.optionB ?? '' },
    { key: 'C', value: question.optionC ?? '' },
    { key: 'D', value: question.optionD ?? '' },
  ];
  const correctAnswer = question.correctAnswer ?? results[currentQuestion]?.correctAnswer ?? null;
  const explanation = question.explanation ?? results[currentQuestion]?.explanation ?? null;

  return (
    <>
    <TestLayout
      title={setData.name}
      {...setSelectorProps}
      durationMinutes={setData.duration ?? undefined}
      totalQuestions={setData.questions.length}
      currentQuestion={currentQuestion}
      answers={answers}
      onQuestionSelect={handleQuestionSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={() => handleSubmit()}
      onTimeUp={handleTimeUp}
      currentQuestionId={question.id}
      onResetAnswer={handleResetAnswer}
    >
      <FocusFormQuestionCard
        key={question.id}
        questionText={question.questionText}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={correctAnswer}
        explanation={explanation}
        conversation={question.conversation ?? null}
        onAnswerSelect={handleAnswer}
        disabled={submitting}
      />
    </TestLayout>

    <ConfirmModal
      isOpen={showSubmitConfirm}
      title="ยังทำข้อสอบไม่ครบ"
      description={`มีคำถามที่ยังไม่ได้ตอบอีก ${unansweredCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`}
      confirmLabel="ส่งคำตอบ"
      cancelLabel="ทำต่อ"
      type="warning"
      onConfirm={executeSubmit}
      onCancel={() => setShowSubmitConfirm(false)}
      isLoading={submitting}
    />

    </>
  );
}
