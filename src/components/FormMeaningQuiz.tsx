'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import FormMeaningFillCard from '@/components/FormMeaningFillCard';
import TestLayout from '@/components/TestLayout';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { clearBlankAnswers, loadBlankAnswers, saveBlankAnswers } from '@/lib/test-progress';
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
  onFinish,
  onAttemptId,
  demo = false,
  onExit,
  durationMinutes = 15,
  reviewAction,
  reviewOverlay,
}: FormMeaningQuizProps) {
  // คำตอบที่กรอกไว้ค้างใน sessionStorage (ต่อชุด) — refresh แล้วไม่ต้องเริ่มกรอกใหม่
  // ชุดตัวอย่าง (demo) ไม่เก็บ: รอบสาธิตไม่ควรค้างข้ามชุด/ข้ามคน
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    demo ? {} : loadBlankAnswers(sectionId, setId),
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [testStartedAt] = useState(() => new Date().toISOString());
  const router = useRouter();

  useEffect(() => {
    if (demo) return;
    saveBlankAnswers(sectionId, setId, answers);
  }, [answers, demo, sectionId, setId]);

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

  /**
   * เฉลยที่ server ส่งกลับมาหลังส่งข้อสอบ (global blank id -> คำตอบที่ถูก)
   *
   * ทำไมต้องมี: /api/test-sets/[id] ถอดเฉลยออกจาก payload ของผู้เรียนแล้ว
   * (stripAnswers → blanks[].correctAnswer ถูกลบ) → ฝั่ง client ไม่มีเฉลยให้เทียบ
   * เฉลยจริงจึงมาจาก response ของ POST /api/tests/submit (server ส่งกลับหลังตรวจเสร็จ)
   */
  const [serverCorrectAnswers, setServerCorrectAnswers] = useState<Record<number, string>>({});

  // คำตอบที่ถูกต่อ blank (จากบทความที่รวมแล้ว)
  // - โหมด demo: มีเฉลยมากับ payload อยู่แล้ว
  // - โหมดจริง: ใช้เฉลยที่ server ส่งกลับมาหลังส่งข้อสอบ
  const correctAnswersMap = useMemo(
    () => Object.fromEntries(
      combinedArticle.blanks.map((b) => [b.id, serverCorrectAnswers[b.id] ?? b.correctAnswer]),
    ),
    [combinedArticle, serverCorrectAnswers]
  );

  /**
   * แปลงเฉลยจาก server ให้เป็น global blank id
   * (server ส่ง key เป็น blank id เดิมของแต่ละข้อ → ต้องแมปกลับมาเป็น id ของบทความที่รวมแล้ว)
   */
  const parseServerCorrectAnswers = (
    results: Array<{ questionId: number; correctAnswer?: string | null }> | undefined,
  ): Record<number, string> => {
    const out: Record<number, string> = {};
    for (const result of results ?? []) {
      let parsed: Record<string, unknown> = {};
      try {
        const raw = JSON.parse(result.correctAnswer ?? '{}');
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          parsed = raw as Record<string, unknown>;
        }
      } catch {
        continue; // ไม่มีเฉลยของข้อนี้ → ข้าม
      }
      for (const [originalBlankId, answer] of Object.entries(parsed)) {
        if (typeof answer !== 'string') continue;
        for (const [globalId, mapping] of globalToOriginal) {
          if (mapping.questionId === result.questionId && String(mapping.originalBlankId) === originalBlankId) {
            out[Number(globalId)] = answer;
          }
        }
      }
    }
    return out;
  };

  const executeSubmit = async () => {
    if (submitting) return; // Guard: prevent double submit
    setSubmitting(true);
    setShowSubmitConfirm(false);
    try {
      // คะแนนฝั่ง client (ใช้ได้เฉพาะตอนที่ payload มีเฉลยมาให้เทียบ = โหมด demo)
      // ถ้าเฉลยถูกถอดออก (โหมดจริง) ให้ข้ามช่องนี้ไป ไม่ใช่ throw
      // — เคยทำให้ผู้เรียนส่งข้อสอบไม่ได้ ("เกิดข้อผิดพลาด กรุณาลองใหม่")
      const localCorrectCount = combinedArticle.blanks.filter(
        (b) => !!b.correctAnswer
          && answers[b.id]?.trim().toLowerCase() === b.correctAnswer.trim().toLowerCase()
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
      // เฉลยจริงมาจาก server (หลังส่งข้อสอบ) → ใช้แสดงผลถูก/ผิดในการ์ด
      if (data.success) {
        setServerCorrectAnswers(parseServerCorrectAnswers(data.data.results));
      }
      setIsSubmitted(true);
      setCorrectCount(serverCorrect);
      // ส่งสำเร็จแล้ว = ไม่เก็บคำตอบค้างไว้อีก (กันการส่งซ้ำเงียบ ๆ หลัง refresh)
      if (data.success) clearBlankAnswers(sectionId, setId);
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
