'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Layers, LogOut, CheckCircle, ArrowRight } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import SelectableText from '@/components/SelectableText';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import type { Blank } from '@/types/test';

export interface FormMeaningQuestionData {
  id: number;
  questionText: string;
  article?: { title: string; text: string; blanks: Blank[] } | null;
}

interface FormMeaningQuizProps {
  questions: FormMeaningQuestionData[];
  sectionId: string;
  setId: number;
  setName: string;
  availableSets?: { id: number; name: string; description?: string | null }[];
  onSetSelect?: (id: number) => void;
  onFinish: (score: number, totalBlanks: number) => void;
  onAttemptId?: (id: number) => void;
  demo?: boolean;
  onExit?: () => void;
  durationMinutes?: number;
}

export default function FormMeaningQuiz({
  questions,
  sectionId,
  setId,
  setName,
  availableSets = [],
  onSetSelect,
  onFinish,
  onAttemptId,
  demo = false,
  onExit,
  durationMinutes = 15,
}: FormMeaningQuizProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [testStartedAt] = useState(() => new Date().toISOString());
  const router = useRouter();
  const setListRef = useRef<HTMLDivElement | null>(null);
  const currentSetRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const list = setListRef.current;
    const current = currentSetRef.current;
    if (list && current) {
      const listRect = list.getBoundingClientRect();
      const elRect = current.getBoundingClientRect();
      list.scrollTop += elRect.top - listRect.top - list.clientHeight / 2 + elRect.height / 2;
    }
  }, [setId]);

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
    const titles = questions.map((q) => q.article?.title).filter((t): t is string => !!t);
    const uniqueTitles = [...new Set(titles)];
    return { title: uniqueTitles.length > 0 ? uniqueTitles.join(' • ') : setName, text: combinedText, blanks: allBlanks };
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

      if (demo) {
        setIsSubmitted(true);
        setCorrectCount(localCorrectCount);
        return;
      }

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
    <div className="min-h-[100dvh] bg-white">
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
                  <span>{durationMinutes} min</span>
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
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-40 md:pb-6">
        <div className="w-full flex items-center justify-between mb-[1.1875rem]">
          <div className="w-72 max-w-full bg-[#F9F9F9] py-1 flex items-center space-x-3 rounded-full ps-4">
            <FileText className="size-[1rem]" />
            <p className="text-[0.9375rem] font-medium">Fill in the blanks</p>
          </div>
        </div>

        <div className="flex gap-6 items-start">
        {/* Desktop Navigation Panel */}
        {availableSets.length > 0 && (
        <div className="hidden md:block max-w-72 w-full shrink-0">
          <div className="rounded-2xl shadow-sm border border-slate-100 sticky top-36 overflow-hidden p-[1.1875rem] bg-[#F9F9F9]">
            <p className="text-xs font-medium text-slate-500 px-1 pb-2">ชุดข้อสอบ</p>
            <div ref={setListRef} className="max-h-[28rem] overflow-y-auto dot-map-scroll flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
              {availableSets.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  ref={s.id === setId ? currentSetRef : null}
                  onClick={() => { if (s.id !== setId && !isSubmitted) onSetSelect?.(s.id); }}
                  className={`text-left px-4 py-3 min-h-[5rem] rounded-xl border transition-colors ${
                    s.id === setId
                      ? 'bg-[#6D89EF] border-[#6D89EF] text-white'
                      : 'bg-white border-[#BFDFEB] hover:border-[#3B82F6] text-slate-700'
                  }`}
                >
                  <span className="block text-sm font-bold truncate">ข้อสอบ - {i + 1}</span>
                  {s.id === setId && (
                    <span className="text-xs font-medium opacity-80">ชุดปัจจุบัน</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        <div className={`flex-1 min-w-0 max-w-4xl ${availableSets.length === 0 ? 'mx-auto' : ''}`}>


        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
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

        </div>
        </div>
      </div>

      {/* Universal Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)]">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-0 md:min-h-[8rem] flex flex-col md:flex-row items-center justify-between gap-3 w-full">
          {/* Progress Ring */}
          <div className="w-full md:w-auto p-2 md:p-0 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 scale-90 md:scale-100 origin-center shrink-0">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="none" />
                  <circle
                    cx="24" cy="24" r="20"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${totalBlanks > 0 ? (answeredCount / totalBlanks) * 125.6 : 0} 125.6`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                  {totalBlanks > 0 ? Math.round((answeredCount / totalBlanks) * 100) : 0}%
                </span>
              </div>
              <div className="text-sm hidden sm:block">
                <p className="text-slate-900 font-medium">{answeredCount} answered</p>
                <p className="text-slate-500">{totalBlanks - answeredCount} remaining</p>
              </div>
              <p className="text-sm font-medium text-slate-900 sm:hidden">
                {answeredCount}/{totalBlanks}
              </p>
            </div>
          </div>

          {/* Submit / View Results */}
          <div className="w-full flex items-center gap-2 md:gap-3 md:w-auto justify-center">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full md:w-[13.875rem] h-14 md:h-[3.375rem] bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full flex items-center space-x-1 justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">ส่งข้อสอบ</span>
                <CheckCircle className="size-[1.125rem] shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => onFinish(correctCount, totalBlanks)}
                className="w-full md:w-[13.875rem] h-14 md:h-[3.375rem] bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full flex items-center space-x-1 justify-center text-white transition-colors"
              >
                <span className="text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap">ดูผลการสอบ</span>
                <ArrowRight className="size-[1.125rem] shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>

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
        onConfirm={() => { if (onExit) onExit(); else router.push(`/tests/${sectionId}`); }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
