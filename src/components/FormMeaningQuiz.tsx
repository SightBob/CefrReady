'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import FormMeaningFillCard from '@/components/FormMeaningFillCard';
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

  // คำตอบที่ถูกต่อ blank (จากบทความที่รวมแล้ว) — ชุดปกติมีเฉลยฝั่ง client ตามเดิม
  const correctAnswersMap = useMemo(
    () => Object.fromEntries(combinedArticle.blanks.map((b) => [b.id, b.correctAnswer])),
    [combinedArticle]
  );

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
      // หลังส่งคำตอบ ปุ่มสุดท้ายของแถบล่างเปลี่ยนจาก "ตรวจคำตอบ" เป็น "ดูผลการสอบ"
      // (primaryAction แทนปุ่ม submit ของ TestLayout — แบบเดียวกับที่หน้าชุดจริงใช้)
      primaryAction={isSubmitted
        ? { label: 'ดูผลการสอบ', onClick: () => onFinish(correctCount, totalBlanks) }
        : undefined}
    >
      <FormMeaningFillCard
        article={combinedArticle}
        answers={answers}
        onInputChange={(blankId, value) => setAnswers((prev) => ({ ...prev, [blankId]: value }))}
        revealed={isSubmitted}
        correctAnswers={correctAnswersMap}
        disabled={submitting}
      >
      </FormMeaningFillCard>
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
