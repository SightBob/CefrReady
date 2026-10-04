'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import SelectableText from '@/components/SelectableText';
import TestLayout from '@/components/TestLayout';
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
  reviewAction?: { label: string; onClick: () => void };
  reviewOverlay?: React.ReactNode;
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
  reviewAction,
  reviewOverlay,
}: FormMeaningQuizProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
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
          // Figma 172:11412 — ช่องกรอก 128×40.45 r8 ขอบ 1.6px #BCD8F0 พื้นขาว ตัวอักษร 18px #9CA3AF กึ่งกลาง
          <span key={key++} className="inline-flex flex-col items-start align-middle">
            <input
              type="text"
              className={`h-[40.45px] w-32 shrink-0 rounded-lg border-[1.6px] bg-white px-2 py-1 text-center align-middle text-[1.125rem] leading-normal focus:outline-none ${isSubmitted
                ? isCorrect
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700 line-through'
                    : isEmpty
                      ? 'border-amber-400 bg-amber-50 text-amber-600'
                      : 'border-slate-300 bg-slate-50'
                : 'border-[#BCD8F0] text-[#9CA3AF] placeholder:text-[#9CA3AF] focus:border-[#BCD8F0]'
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

  // Figma 172:11322 — shell เดียวกับหน้า focus-meaning / listening
  // (dropdown ชุด · progress pill · ปุ่มปิด · การ์ดเลขข้อ · คลังกริยา · แถบล่าง)
  // ข้อความแถบล่างเป็น "ตรวจคำตอบ" ซึ่ง TestLayout เลือกเมื่อ currentQuestion อยู่ที่ข้อสุดท้าย
  const layoutCurrentQuestion = Math.max(0, totalBlanks - 1);

  return (
    <>
    <TestLayout
      title={setName}
      durationMinutes={durationMinutes}
      totalQuestions={totalBlanks}
      currentQuestion={layoutCurrentQuestion}
      answers={combinedArticle.blanks.map((b) => answers[b.id] || null)}
      availableSets={availableSets}
      currentSetId={setId}
      onSetSelect={(id) => { if (!isSubmitted) onSetSelect?.(id); }}
      sectionIcon={Layers}
      sectionColor="from-purple-500 to-pink-500"
      onSubmit={handleSubmit}
      isSubmitted={isSubmitted}
      onExit={() => { if (onExit) onExit(); else router.push(`/tests/${sectionId}`); }}
      reviewAction={reviewAction}
      sequentialNav
    >
      {/* Figma 172:11331 — การ์ด 840×505 r20 พื้นขาว ไม่มีเงา/เส้นขอบ
          · หัวข้อ 172:11404 x30 y25  ·  เนื้อหา 172:11407 x33 y62 w773 */}
      <div className="w-full rounded-[20px] bg-white pt-[25px] pb-[35px]">
        {/* 172:11404 — หัวบทความ 16px SemiBold #404040 uppercase tracking 0.35px leading 18px */}
        <h2 className="px-[30px] text-[1rem] font-semibold uppercase leading-[18px] tracking-[0.35px] text-[#404040]">
          <SelectableText text={combinedArticle.title} contextSentence={combinedArticle.title} inline />
        </h2>

        {/* 172:11407 — เส้นคั่น 1px #E9E9E9 · เนื้อหา · เส้นคั่น (gap 9px รอบแถว)
            172:11409 — ช่องไฟข้าง 8px · แต่ละบรรทัดสูง 40.45px (ช่องกรอก) เว้นกัน 24px
            → ใน flow ข้อความเดียว ใช้ line-height 64.45px = 40.45 + 24 และช่องกรอก align-middle */}
        <div className="mt-[19px] px-[33px]">
          <div className="h-px w-full rounded-[29px] bg-[#E9E9E9]" />

          <div className="mt-[9px] px-2 text-[1.125rem] font-medium leading-[64.45px] text-[#334155]">
            {renderArticle()}
          </div>

          <div className="mt-[9px] h-px w-full rounded-[29px] bg-[#E9E9E9]" />
        </div>

        {/* หลังส่งคำตอบแล้ว TestLayout จะแสดงปุ่ม “ทำชุดถัดไป” แทน
            ปุ่มดูผลการสอบจึงต้องอยู่ในการ์ดบทความตามเดิม */}
        {isSubmitted && (
          <button
            type="button"
            onClick={() => onFinish(correctCount, totalBlanks)}
            className="mt-6 flex h-[3.375rem] w-[13.875rem] items-center justify-center rounded-full bg-[#6D89EF] text-base font-bold text-white hover:bg-[#5A75E0]"
          >
            ดูผลการสอบ
          </button>
        )}
      </div>
    </TestLayout>

    {reviewOverlay}

    <ConfirmModal
      isOpen={showSubmitConfirm}
      onCancel={() => setShowSubmitConfirm(false)}
      onConfirm={executeSubmit}
      title="ยืนยันการส่งคำตอบ"
      description="คุณยังมีคำถามที่ยังไม่ได้ตอบ คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบ?"
      confirmLabel="ส่งคำตอบ"
    />
    </>
  );
}
