'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BookOpen, Shuffle } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import QuizLoadingSkeleton from '@/components/QuizLoadingSkeleton';
import {
  expandTestSetSlots,
  getChoiceOptionText,
  getDisplayedTapChoiceAnswer,
  getOriginalChoiceAnswer,
  getOriginalTapChoiceAnswer,
  shuffleTapExerciseChoices,
  type ShuffledChoiceOption,
  type TestSetSlot,
} from '@/lib/test-set-slots';
import type { DemoQuestionRow } from '@/lib/demo-set';
import type { ReviewItem } from '@/components/TestResults';

const TestLayout = dynamic(() => import('@/components/TestLayout'));
const TestResults = dynamic(() => import('@/components/TestResults'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 shadow-lg" style={{ minHeight: '400px' }} />,
});
const ListeningAudioPlayer = dynamic(() => import('@/components/ListeningAudioPlayer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 md:p-8" style={{ minHeight: '400px' }} />,
});
const TestTapSelectCard = dynamic(() => import('@/components/TestTapSelectCard'));

/** โครงข้อสอบ demo แบบปนทุกทักษะ — มาจาก GET /api/tests/demo (demo mode ส่งเฉลยมาให้) */
type DemoQuestion = DemoQuestionRow;

const SECTION_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  'focus-form': { icon: Shuffle, color: 'from-sky-500 to-indigo-500', label: 'Focus on Form' },
  'focus-meaning': { icon: BookOpen, color: 'from-emerald-500 to-teal-500', label: 'Focus on Meaning' },
  'form-meaning': { icon: Shuffle, color: 'from-purple-500 to-pink-500', label: 'Form & Meaning' },
  listening: { icon: Shuffle, color: 'from-orange-500 to-amber-500', label: 'Listening' },
};

function questionChoices(question: DemoQuestion): ShuffledChoiceOption[] {
  return [
    { key: 'A', value: question.optionA },
    { key: 'B', value: question.optionB },
    { key: 'C', value: question.optionC },
    { key: 'D', value: question.optionD },
  ]
    .filter((option): option is { key: string; value: string } => Boolean(option.value))
    .map((option) => ({ ...option, answerKey: option.key }));
}

/** คำตอบที่ถูกของ slot นี้ในรูปแบบเดียวกับชุดจริง (A/B/C/D ต้นฉบับ หรือข้อความเติม) */
function correctSlotAnswer(q: DemoQuestion, slot: TestSetSlot): string {
  if (slot.kind === 'tap') {
    const item = q.tapExercise?.items[slot.itemIndex];
    return item && item.correct !== undefined ? (item.correct === 0 ? 'A' : 'B') : '';
  }
  if (slot.kind === 'article') {
    return q.article?.blanks.find((blank) => blank.id === slot.blankId)?.correctAnswer ?? '';
  }
  return q.correctAnswer ?? '';
}

/** เช็คถูกผิดราย slot — กติกาเดียวกับ findIncorrectTestSetSlots ของชุดจริง */
function slotIsCorrect(q: DemoQuestion, slot: TestSetSlot, raw: string): boolean {
  let userAnswer = raw;
  if (slot.kind === 'question') {
    userAnswer = getOriginalChoiceAnswer(raw, questionChoices(q));
  } else if (slot.kind === 'tap') {
    const item = q.tapExercise?.items[slot.itemIndex];
    if (item) {
      const { answerKeys } = shuffleTapExerciseChoices(item, `demo-${q.id}-tap-${slot.itemIndex}`);
      userAnswer = getOriginalTapChoiceAnswer(raw, answerKeys);
    }
  }
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  return userAnswer !== '' && normalize(userAnswer) === normalize(correctSlotAnswer(q, slot));
}

export default function DemoExamPage() {
  const router = useRouter();
  const [data, setData] = useState<DemoQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlot, setCurrentSlot] = useState(0);
  /** คำตอบราย slot (เก็บรูปแบบที่แสดงบนจอ — ตอนนับคะแนนค่อยแปลงกลับ) */
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tests/demo');
      const body = await res.json();
      if (body.success) {
        setData(body.data);
        setAnswers(new Array(body.data.reduce((sum: number, q: DemoQuestion) => {
          if (q.tapExercise?.items?.length) return sum + q.tapExercise.items.length;
          if (q.testTypeId === 'form-meaning' && q.article?.blanks?.length) return sum + q.article.blanks.length;
          return sum + 1;
        }, 0)).fill(null));
      }
    } catch (error) {
      console.error('Error fetching mixed demo questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const questions = useMemo<DemoQuestion[]>(() => data ?? [], [data]);
  const slots = useMemo<TestSetSlot[]>(() => (data ? expandTestSetSlots(data) : []), [data]);

  const activeSlot = slots[currentSlot] ?? null;
  const question = activeSlot ? questions[activeSlot.questionIndex] : undefined;
  const selectedAnswer = activeSlot ? (answers[currentSlot] ?? null) : null;

  /** ตัวเลือกของข้อปัจจุบัน (demo แสดงลำดับ A–D ตามที่แอดมินตั้ง — ไม่สลับ) */
  const choices = useMemo(
    () => (question && activeSlot?.kind !== 'tap' && activeSlot?.kind !== 'article' ? questionChoices(question) : []),
    [question, activeSlot]
  );

  const handleAnswer = (answer: string) => {
    if (!activeSlot || answers[currentSlot] !== null) return;
    setAnswers((prev) => prev.map((value, index) => (index === currentSlot ? answer : value)));
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentSlot(index);
  };

  const handleNext = () => {
    if (currentSlot < slots.length - 1) handleQuestionSelect(currentSlot + 1);
  };
  const handlePrevious = () => {
    if (currentSlot > 0) handleQuestionSelect(currentSlot - 1);
  };

  const handleSubmit = () => {
    const unanswered = answers.filter((answer) => answer === null || answer === '').length;
    if (unanswered > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    executeSubmit();
  };

  const executeSubmit = () => {
    setShowSubmitConfirm(false);
    // นับคะแนนราย slot — กติกาเดียวกับ findIncorrectTestSetSlots ของชุดจริง
    let correct = 0;
    slots.forEach((slot, index) => {
      if (slotIsCorrect(questions[slot.questionIndex], slot, answers[index] ?? '')) correct += 1;
    });

    setScore(correct);
    setIsFinished(true);
  };

  const handleRestart = () => {
    setCurrentSlot(0);
    setScore(0);
    setIsFinished(false);
    fetchQuestions();
  };

  const unansweredCount = answers.filter((answer) => answer === null || answer === '').length;

  /** เฉลยรายข้อสำหรับหน้า result แบบชุดจริง (TestResults · Figma 75:70726) */
  const reviewItems = useMemo<ReviewItem[]>(() => {
    if (!data) return [];
    return slots.map((slot, index) => {
      const q = questions[slot.questionIndex];
      const raw = answers[index] ?? '';
      let questionText = q.questionText;
      let userAnswer: string | null = raw || null;
      let correctText: string | null = null;

      if (slot.kind === 'tap') {
        const item = q.tapExercise?.items[slot.itemIndex];
        questionText = [q.tapExercise?.title, item?.prompt].filter(Boolean).join(' — ') || q.questionText;
        if (item) {
          const { item: displayItem, answerKeys } = shuffleTapExerciseChoices(item, `demo-${q.id}-tap-${slot.itemIndex}`);
          userAnswer = raw ? getDisplayedTapChoiceAnswer(getOriginalTapChoiceAnswer(raw, answerKeys), answerKeys) : null;
          const correctOriginal = item.correct === undefined ? null : item.correct === 0 ? 'A' : 'B';
          correctText = correctOriginal ? (correctOriginal === 'A' ? displayItem.choiceA : displayItem.choiceB) : null;
        } else {
          userAnswer = raw || null;
        }
      } else if (slot.kind === 'question') {
        userAnswer = raw ? getChoiceOptionText(q, raw) : null;
        correctText = q.correctAnswer ? getChoiceOptionText(q, q.correctAnswer) : null;
      } else if (slot.kind === 'article') {
        correctText = q.article?.blanks.find((blank) => blank.id === slot.blankId)?.correctAnswer ?? null;
        userAnswer = raw || null;
      }

      return {
        index: index + 1,
        questionText,
        userAnswer,
        correctAnswer: correctText,
        isCorrect: slotIsCorrect(q, slot, raw),
      };
    });
  }, [data, slots, answers, questions]);

  if (loading) {
    return <QuizLoadingSkeleton />;
  }

  if (isFinished) {
    // หน้า result แบบเดียวกับชุดข้อสอบจริง (Figma 75:70682) — ไม่ใช่ TestResultsDemo
    return (
      <TestResults
        score={score}
        totalQuestions={slots.length}
        onRestart={handleRestart}
        sectionIcon={Shuffle}
        sectionColor="from-sky-500 to-indigo-500"
        headerTitle="โหมดตัวอย่าง (ปนทุกทักษะ)"
        durationMinutes={5}
        sectionId="full-test"
        reviewItems={reviewItems}
        endHref="/"
      />
    );
  }

  if (!question || !activeSlot) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg font-semibold text-slate-700">Demo coming soon</p>
          <p className="text-sm text-slate-500 mt-2">No demo questions are available yet. Please check back later.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    );
  }

  const meta = SECTION_META[question.testTypeId] ?? SECTION_META['focus-form'];

  // Modal ยืนยันส่งข้อสอบ — แบบเดียวกับหน้าชุดจริง
  const confirmModal = (
    <ConfirmModal
      isOpen={showSubmitConfirm}
      title="ยังทำข้อสอบไม่ครบ"
      description={`มีคำถามที่ยังไม่ได้ตอบอีก ${unansweredCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`}
      confirmLabel="ส่งคำตอบ"
      cancelLabel="ทำต่อ"
      type="warning"
      onConfirm={executeSubmit}
      onCancel={() => setShowSubmitConfirm(false)}
    />
  );

  const layoutProps = {
    title: 'โหมดตัวอย่าง (ปนทุกทักษะ)',
    durationMinutes: 5,
    totalQuestions: slots.length,
    currentQuestion: currentSlot,
    answers,
    onQuestionSelect: handleQuestionSelect,
    onPrevious: handlePrevious,
    onNext: handleNext,
    onSubmit: handleSubmit,
    currentQuestionId: question.id,
    sectionIcon: meta.icon,
    sectionColor: meta.color,
    sectionLabel: meta.label,
    onExit: () => router.push('/'),
  };

  // ─── Slot: tap & select item ─────────────────────────────────────
  if (activeSlot.kind === 'tap') {
    const tapItem = question.tapExercise!.items[activeSlot.itemIndex];
    const { item: displayItem, answerKeys } = shuffleTapExerciseChoices(tapItem, `demo-${question.id}-tap-${activeSlot.itemIndex}`);
    const storedChoice = selectedAnswer === null ? null : getOriginalTapChoiceAnswer(selectedAnswer, answerKeys);
    const correctChoice = tapItem.correct === undefined ? null : tapItem.correct === 0 ? 'A' : 'B';

    return (
      <>
        <TestLayout {...layoutProps}>
          <TestTapSelectCard
            key={`${question.id}-${activeSlot.itemIndex}`}
            title={question.tapExercise?.title ?? question.questionText}
            hint={question.tapExercise?.hint}
            item={displayItem}
            itemIndex={activeSlot.itemIndex}
            selectedAnswer={selectedAnswer}
            onAnswer={handleAnswer}
            answerIsCorrect={storedChoice !== null && correctChoice !== null ? storedChoice === correctChoice : null}
            disabled={false}
          />
        </TestLayout>
        {confirmModal}
      </>
    );
  }

  // ─── Slot: form-meaning blank ────────────────────────────────────
  if (activeSlot.kind === 'article') {
    const blank = question.article?.blanks.find((item) => item.id === activeSlot.blankId);
    const readableText =
      question.article?.blanks.reduce((text, item) => text.replaceAll(`{{${item.id}}}`, '_____'), question.article?.text ?? '') ?? '';    return (
      <>
        <TestLayout {...layoutProps}>

        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-slate-800">{question.article?.title || question.questionText}</h2>
          <p className="whitespace-pre-line text-base leading-8 text-slate-700">{readableText}</p>
          <label className="block text-sm font-semibold text-slate-700">
            ข้อ {activeSlot.blankId}: เติมคำตอบ
            <input
              value={selectedAnswer ?? ''}
              onChange={(event) => handleAnswer(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-blue-400 focus:outline-none"
              placeholder={blank?.hint || 'พิมพ์คำตอบ'}
            />
          </label>
        </div>
      </TestLayout>
        {confirmModal}
      </>
    );
  }

  // ─── Slot: listening ─────────────────────────────────────────────
  if (question.testTypeId === 'listening') {
    return (
      <>
        <TestLayout {...layoutProps}>
        <ListeningAudioPlayer
          key={question.id}
          audioUrl={question.audioUrl ?? undefined}
          transcript={question.transcript ?? question.questionText}
          questionText={question.questionText}
          options={choices}
          selectedAnswer={selectedAnswer}
          correctAnswer={selectedAnswer !== null ? question.correctAnswer : null}
          explanation={selectedAnswer !== null ? question.explanation || 'See transcript above.' : null}
          onAudioPlayed={() => {}}
          onAnswerSelect={handleAnswer}
          disabled={false}
        />
        </TestLayout>
        {confirmModal}
      </>
    );
  }

  // ─── Slot: MCQ (focus-form / focus-meaning) ───────────────────────
  const storedSelected = selectedAnswer === null ? null : getOriginalChoiceAnswer(selectedAnswer, choices);
  const isCorrect =
    storedSelected !== null ? storedSelected.toLocaleLowerCase() === (question.correctAnswer ?? '').toLocaleLowerCase() : null;

  return (
    <>
      <TestLayout {...layoutProps}>
        <FocusFormQuestionCard
          key={question.id}
          questionText={question.questionText}
          options={choices}
          selectedAnswer={selectedAnswer}
          correctAnswer={isCorrect !== null ? question.correctAnswer : null}
          explanation={selectedAnswer !== null ? question.explanation : null}
          conversation={question.conversation ?? null}
          onAnswerSelect={handleAnswer}
          disabled={false}
          accent={question.testTypeId === 'focus-meaning' ? 'emerald' : undefined}
          headerIcon={question.testTypeId === 'focus-meaning' ? BookOpen : undefined}
          headerLabel={question.testTypeId === 'focus-meaning' ? 'Conversation' : undefined}
        />
      </TestLayout>
      {confirmModal}
    </>
  );
}
