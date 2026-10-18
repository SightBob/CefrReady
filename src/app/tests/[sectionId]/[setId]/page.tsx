'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { BookOpen, Headphones, Layers, PenTool } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { createLatestRequestGuard, isAbortError } from '@/lib/latest-request';
import { MAX_TAP_REASON_LENGTH, tapAiFeedbackSchema, type TapReasonResult } from '@/lib/tap-ai';

import type { QuestionResult, Option, Blank } from '@/types/test';
import { usePostHog } from '@/lib/posthog';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import {
  buildTestSubmissionAnswers,
  countTestSetItems,
  createQuestionChoiceOptions,
  expandTestSetSlots,
  getChoiceOptionText,
  getDisplayedChoiceAnswer,
  getOriginalChoiceAnswer,
  getOriginalTapChoiceAnswer,
  shuffleTapExerciseChoices,
  type ShuffledChoiceOption,
  type TapChoiceKey,
  type TestSetSlot,
  type TapExerciseData,
  type TapExerciseItem,
} from '@/lib/test-set-slots';
import type { PublicTapExerciseData } from '@/lib/test-set-slots';
import dynamic from 'next/dynamic';
import TestExplainOverlay, { type TestExplainContent } from '@/components/TestExplainOverlay';
import { buildTopicRuns, firstSlotIndexForTopic, topicRunForSlot } from '@/lib/test-set-topics';
import { wasSetExplainRead, clearSetExplainRead } from '@/lib/test-explain-read';
import { groupTapReasonsByQuestion } from '@/lib/tap-reason-rewards';

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

/** ผลตรวจคำตอบหนึ่ง slot — เฉลยมาจาก POST /api/tests/check-answer ตอนผู้เรียนกดตรวจ */
type AnswerCheck = {
  isCorrect: boolean;
  /** ป้ายเฉลยแบบต้นฉบับ (A/B/C/D) หรือ null ถ้าเป็นช่องกรอกคำ */
  correctKey: string | null;
  /** ข้อความเฉลยสำหรับช่องกรอกคำ */
  correctText: string | null;
  explanation: string | null;
};

/** คืนคีย์คำตอบถูกจากเฉลยที่ติดมากับ payload (ไม่มีในข้อมูลชนิด Public ที่ถูกถอดเฉลย) */
function tapCorrectChoice(
  item: TapExerciseItem | Omit<TapExerciseItem, 'correct'> | undefined,
): TapChoiceKey | null {
  if (!item || !('correct' in item)) return null;
  return item.correct === 0 ? 'A' : item.correct === 1 ? 'B' : null;
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

  // โหมดพรีวิวของแอดมิน (?preview=1): ดูหน้าสอบจริงพร้อมเนื้อหา explain ที่ยังไม่เผยแพร่
  // — ตัว API เป็นคนตรวจสิทธิ์ผู้ดูแลจริง ๆ ฝั่งนี้เป็นแค่การส่งธงกับแบนเนอร์
  const searchParams = useSearchParams();
  const previewMode = searchParams.get('preview') === '1';
  const previewNotice = previewMode
    ? 'โหมดพรีวิวสำหรับแอดมิน — เห็นเนื้อหาที่ยังไม่เผยแพร่ (ฉบับร่าง/รอตรวจสอบ/ปิดชั่วคราว) ทั้งหน้าอธิบายและกิจกรรม Tap & Select แต่ผู้เรียนยังไม่เห็น'
    : undefined;
  /** เรื่องที่แอดมินขอเปิดตรง ๆ (?topic=…) — ใช้เฉพาะโหมดพรีวิว */
  const previewTopic = previewMode ? searchParams.get('topic') : null;

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [maintenanceBlocked, setMaintenanceBlocked] = useState(false);

  // Gate: พาร์ทนี้ถูก admin ปิดปรับปรุง → หน้าแจ้งเฉพาะพาร์ท (เช่น เข้าทาง URL ตรง)
  useEffect(() => {
    fetch('/api/tests-maintenance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sections?: Record<string, boolean> } | null) => {
        if (data?.sections?.[sectionId]) {
          setMaintenanceBlocked(true);
          router.replace(`/tests/${sectionId}/maintenance`);
        }
      })
      .catch(() => undefined); // fail-open
  }, [router, sectionId]);

  // Standard quiz state (MCQ types)
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [tapReasons, setTapReasons] = useState<Record<string, string>>({});
  const [tapReasonResults, setTapReasonResults] = useState<Record<string, TapReasonResult>>({});
  const [tapReasonErrors, setTapReasonErrors] = useState<Record<string, string>>({});
  const [tapChecking, setTapChecking] = useState<Record<string, boolean>>({});
  const tapRequestVersions = useRef<Record<string, number>>({});
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
  const explainCache = useRef(new Map<string, TestExplainContent | null>());
  const explainRequestId = useRef(0);
  // กัน response ของชุดเก่าทับ state ของชุดใหม่ตอนสลับชุดเร็ว ๆ
  const setRequestGuard = useRef(createLatestRequestGuard()).current;

  // เนื้อหา explain ของทุกเรื่องที่ผูกกับชุดนี้ (คีย์ตาม grammarTopic) — ชุดที่รวม
  // หลายเรื่องไว้จะเด้ง intro+explain ของเรื่องนั้นตอนขึ้นเรื่องใหม่
  const [topicExplains, setTopicExplains] = useState<Record<string, TestExplainContent>>({});
  const [explainsLoaded, setExplainsLoaded] = useState(false);
  /** คิวอธิบายทุกเรื่องของชุด — แสดงทีละเรื่องหลังหน้า intro ตอนเริ่มชุด (เรื่องแรกอยู่หัวคิว) */
  const [introQueue, setIntroQueue] = useState<TestExplainContent[]>([]);
  /** เรื่องที่เด้งไปแล้วในรอบนี้ — เด้งครั้งเดียวต่อเรื่องต่อการทำชุดหนึ่งครั้ง */
  const seenTopics = useRef(new Set<string>());

  // Listening state: track per-question whether audio has finished playing
  const [audioPlayedMap, setAudioPlayedMap] = useState<Record<number, boolean>>({});

  // ANSWER HIDING: เฉลยมาจาก POST /api/tests/check-answer ตอนผู้เรียนกด "ตรวจคำตอบ"
  // เท่านั้น payload ของชุดไม่มีเฉลยติดมา (Tap ใช้ tapReasonResults เป็นตัวบอกว่าตรวจแล้ว)
  const [checkedSlots, setCheckedSlots] = useState<Record<number, AnswerCheck>>({});
  const [checkingSlot, setCheckingSlot] = useState<Record<number, boolean>>({});
  const [checkErrors, setCheckErrors] = useState<Record<number, string>>({});

  // Set selector dropdown
  const [availableSets, setAvailableSets] = useState<{ id: number; name: string; description?: string | null }[]>([]);
  const mainSlots = useMemo(() => setData ? expandTestSetSlots(setData.questions) : [], [setData]);
  /** ช่วงเรื่องตามลำดับข้อสอบ — จุดที่ผู้เรียนจะเจอหน้า intro ของเรื่องใหม่ */
  const topicRuns = useMemo(() => (setData ? buildTopicRuns(setData.questions, mainSlots) : []), [setData, mainSlots]);
  // โหมดพรีวิวของแอดมิน: กระโดดไปข้อแรกของเรื่องที่ขอมา (?topic=…) เพื่อดูว่าเนื้อหาที่
  // ยังไม่เผยแพร่จะโผล่ตอนทำข้อสอบอย่างไร — ไม่แตะพฤติกรรมการสอบปกติ (ไม่มี topic = ไม่ขยับ)
  const previewJumped = useRef(false);
  useEffect(() => {
    if (!previewTopic || previewJumped.current || !setData) return;
    const slotIndex = firstSlotIndexForTopic(topicRuns, previewTopic);
    previewJumped.current = true;
    if (slotIndex === null || slotIndex <= 0 || slotIndex >= mainSlots.length) return;
    setCurrentQuestion(slotIndex);
  }, [previewTopic, setData, topicRuns, mainSlots.length]);

  const choiceShuffleSeed = `${setId}-${testStartedAt}`;
  const mainSlot = mainSlots[currentQuestion];
  const explainQuestionIndex = (mainSlot?.questionIndex ?? currentQuestion);
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
    fetch(`/api/test-explains/lookup?topic=${encodeURIComponent(explainTopic)}&setId=${setId}${previewMode ? '&preview=1' : ''}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (requestId !== explainRequestId.current) return;
        const result = payload?.success && payload.data ? payload.data as import('@/components/TestExplainOverlay').TestExplainContent : null;
        explainCache.current.set(explainTopic, result);
        setTestExplain(result);
        // ไม่เปิดอัตโนมัติ — ผู้เรียนต้องกดปุ่ม “โหมดทบทวน” เองจึงจะเห็นเนื้อหาอธิบาย
        // (payload.auto จึงไม่ถูกใช้แล้ว แต่ API ยังส่งกลับมาไว้เผื่อหน้าอื่น)
      })
      .catch(() => {
        if (requestId === explainRequestId.current) setTestExplain(null);
      });
  }, [explainTopic, setId, previewMode]);

  // เด้ง intro + explain เฉพาะ "เรื่องแรกของชุด" ก่อนข้อ 1 ครั้งเดียว — เรื่องถัด ๆ ไป
  // ไม่เด้งระหว่างทำข้อสอบ (เนื้อหายังเปิดซ้ำได้ทุกเรื่องผ่านปุ่ม "โหมดทบทวน")
  // ยกเว้น: ผู้เรียนเพิ่งอ่านหน้า /explain ระดับชุดมา — เนื้อหาเดียวกันอย่าให้อ่านซ้ำ
  useEffect(() => {
    if (!setData || !explainsLoaded) return;
    if (currentQuestion !== 0) return; // เด้งเฉพาะตอนเริ่มชุด (ข้อแรก)
    // คิวถูกสร้างครั้งเดียวต่อการทำชุดหนึ่งครั้ง (fetchSet ล้าง seenTopics เมื่อเปลี่ยนชุด)
    if (seenTopics.current.size > 0) return;
    // รวมทุกเรื่องของชุดตามลำดับข้อสอบ (เรื่องซ้ำที่ไม่ติดกันแสดงครั้งเดียว)
    const queue: TestExplainContent[] = [];
    for (const run of topicRuns) {
      const topic = run.topic;
      if (!topic || seenTopics.current.has(topic)) continue;
      const explain = topicExplains[topic];
      if (!explain) continue;
      seenTopics.current.add(topic);
      queue.push(explain);
    }
    if (queue.length === 0) return;
    if (wasSetExplainRead(sectionId, setId)) {
      // เพิ่งอ่านจากหน้า /explain แล้ว — ข้าม และรีเซ็ต flag ให้ครั้งถัดไปเด้งตามปกติ
      clearSetExplainRead(sectionId, setId);
      return;
    }
    setIntroQueue(queue);
  }, [currentQuestion, explainsLoaded, setData, topicExplains, topicRuns, sectionId, setId]);

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
  };

  // PostHog tracking
  const posthog = usePostHog();
  const testStartedAtRef = useRef<number>(0);

  // ปุ่ม "โหมดทบทวน" — ใช้ร่วมกันทุก skill (Form & Meaning / Tap & Select /
  // Listening / Focus on Meaning / Focus on Form) แล้ว capture ก่อนเปิด overlay
  const openReviewMode = useCallback(() => {
    // โหมด preview ของแอดมินเปิดหน้าจอเดียวกันนี้ — ไม่ใช่การใช้งานของผู้เรียน
    // ถ้านับรวมจะทำให้ตัวเลข review_mode_opened เพี้ยน
    if (!previewMode) {
      posthog?.capture('review_mode_opened', {
        section_id: sectionId,
        test_set_id: setId,
      });
    }
    setShowTestExplain(true);
  }, [posthog, sectionId, setId, previewMode]);

  const fetchSet = useCallback(async () => {
    // เปลี่ยนชุด (dropdown) = เริ่มนับเรื่องใหม่ — ไม่งั้นชุดใหม่ที่ใช้ชื่อเรื่อง
    // เดิมจะไม่เด้ง intro ให้อีก
    seenTopics.current.clear();
    setIntroQueue([]);
    // สลับชุดเร็ว ๆ response ของชุดเก่าจะกลับมาทีหลังแล้วทับของชุดใหม่
    const { signal, isCurrent } = setRequestGuard.begin();
    try {
      // เนื้อหา explain รายเรื่องโหลดคู่กับตัวชุดไปเลย เพื่อให้รู้ก่อนข้อแรกว่ามีเรื่อง
      // อะไรให้เด้ง — ถ้าโหลดไม่ได้ก็เข้าสอบต่อได้ (แค่ไม่มีหน้า intro ของเรื่อง)
      const [res, explainsRes] = await Promise.all([
        fetch(`/api/test-sets/${setId}${previewMode ? '?preview=1' : ''}`, { signal }),
        fetch(`/api/test-sets/${setId}/explains${previewMode ? '?preview=1' : ''}`, { signal }).catch(() => null),
      ]);
      const data = await res.json();
      // รอบนี้ถูกยกเลิกไปแล้ว (มีการสลับชุดหรือ unmount) — ห้ามแตะ state
      if (!isCurrent()) return;
      try {
        const explainsData = explainsRes ? await explainsRes.json() : null;
        setTopicExplains(explainsData?.success && explainsData.data ? explainsData.data : {});
      } catch {
        setTopicExplains({});
      }
      if (data.success) {
        // Keep the authored test-set order so teaching groups remain inserted
        // between the intended exam questions.
        const finalQuestions: RawQuestion[] = data.data.questions;
        setSetData({ ...data.data, questions: finalQuestions });
        setAnswers(Array(countTestSetItems(finalQuestions)).fill(null));
      } else {
        setNotFound(true);
      }
    } catch (err) {
      // ถูกยกเลิกเองไม่ใช่ข้อผิดพลาด — ห้ามเด้งหน้า notFound
      if (isAbortError(err)) return;
      if (!isCurrent()) return;
      setNotFound(true);
    } finally {
      if (isCurrent()) {
        setExplainsLoaded(true);
        setLoading(false);
      }
    }
  }, [setId, previewMode, setRequestGuard]);

  // ยกเลิก request ที่ค้างอยู่ตอนออกจากหน้า
  useEffect(() => () => setRequestGuard.abort(), [setRequestGuard]);

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

  /**
   * ข้อความตัวเลือกที่ผู้เรียนเห็นแล้วกด — ส่งให้ AI แทนป้าย A/B เพราะหน้าจอสลับตัวเลือก
   * ตาม seed ทำให้ป้ายบนจอไม่ตรงกับป้ายในฐานข้อมูล (เคยตอบผิดว่า “คุณเลือก B”
   * ทั้งที่ผู้เรียนกด A)
   */
  const toDisplayedTapText = useCallback((question: RawQuestion, slot: TestSetSlot, answer: string): string | undefined => {
    if (slot.kind !== 'tap' || (answer !== 'A' && answer !== 'B')) return undefined;
    const item = question.tapExercise?.items[slot.itemIndex];
    if (!item) return undefined;
    const { item: displayItem } = shuffleTapExerciseChoices(item, `${choiceShuffleSeed}-${question.id}-tap-${slot.itemIndex}`);
    return answer === 'A' ? displayItem.choiceA : displayItem.choiceB;
  }, [choiceShuffleSeed]);

  // ─── Answer + navigation handlers ────────────────────────────────

  const tapStateKey = useCallback((slotIndex: number) => `${setId}-main-${slotIndex}`, [setId]);

  /** slot นี้ผู้เรียนเปิดเฉลยแล้วหรือยัง (Tap ใช้ผลจาก AI เป็นตัวบอก) */
  const isSlotChecked = useCallback((slotIndex: number, slot: TestSetSlot | undefined): boolean => {
    if (slot?.kind === 'tap') return tapReasonResults[tapStateKey(slotIndex)] !== undefined;
    return checkedSlots[slotIndex] !== undefined;
  }, [checkedSlots, tapReasonResults, tapStateKey]);

  const clearSlotCheck = useCallback((slotIndex: number) => {
    setCheckedSlots(current => { const next = { ...current }; delete next[slotIndex]; return next; });
    setCheckErrors(current => { const next = { ...current }; delete next[slotIndex]; return next; });
  }, []);

  /**
   * ตรวจคำตอบของ slot ที่ไม่ใช่ Tap (Tap ใช้ checkTapReason เพราะต้องการ AI ด้วย)
   * คืนป้ายเฉลยแบบต้นฉบับจากเซิร์ฟเวอร์ แล้วแปลงเป็นป้ายที่ผู้เรียนเห็นบนจอ
   */
  const checkSlotAnswer = useCallback(async () => {
    if (!setData || selectedAnswer === null || submitting) return;
    const slotIndex = currentQuestion;
    const slot = mainSlots[slotIndex];
    if (!slot || slot.kind === 'tap' || checkingSlot[slotIndex]) return;
    const question = setData.questions[slot.questionIndex];
    setCheckingSlot(current => ({ ...current, [slotIndex]: true }));
    setCheckErrors(current => { const next = { ...current }; delete next[slotIndex]; return next; });
    try {
      const response = await fetch('/api/tests/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSetId: setId,
          questionId: question.id,
          ...(slot.kind === 'article' ? { blankId: slot.blankId } : {}),
          selectedAnswer: toStoredAnswer(question, slot, selectedAnswer),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'ตรวจคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง');
      const result: AnswerCheck = {
        isCorrect: Boolean(body.data.isCorrect),
        correctKey: typeof body.data.correctKey === 'string' ? body.data.correctKey : null,
        correctText: typeof body.data.correctText === 'string' ? body.data.correctText : null,
        explanation: typeof body.data.explanation === 'string' ? body.data.explanation : null,
      };
      setCheckedSlots(current => ({ ...current, [slotIndex]: result }));
    } catch (error) {
      setCheckErrors(current => ({ ...current, [slotIndex]: error instanceof Error ? error.message : 'ตรวจคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง' }));
    } finally {
      setCheckingSlot(current => ({ ...current, [slotIndex]: false }));
    }
  }, [checkingSlot, currentQuestion, mainSlots, selectedAnswer, setData, setId, submitting, toStoredAnswer]);

  const handleAnswer = (answer: string) => {
    if (!setData) return;
    const slot = mainSlots[currentQuestion];
    // เปลี่ยนคำตอบได้ตราบใดที่ยังไม่ได้กดตรวจ — หลังตรวจแล้วการ์ดจะ disable ปุ่มตัวเลือก
    if (isSlotChecked(currentQuestion, slot)) return;
    if (selectedAnswer === answer) return;
    const next = [...answers];
    next[currentQuestion] = answer;
    setAnswers(next);
    setSelectedAnswer(answer);
    // คำตอบใหม่ = ผลตรวจของคำตอบเดิมใช้ไม่ได้แล้ว (กันเฉลย/feedback ค้างจากข้อเก่า)
    if (slot?.kind === 'tap') clearTapFeedback(tapStateKey(currentQuestion));
    else clearSlotCheck(currentQuestion);
  };

  const clearTapFeedback = (key: string) => {
    tapRequestVersions.current[key] = (tapRequestVersions.current[key] ?? 0) + 1;
    setTapReasonResults(current => { const next = { ...current }; delete next[key]; return next; });
    setTapReasonErrors(current => { const next = { ...current }; delete next[key]; return next; });
    setTapChecking(current => ({ ...current, [key]: false }));
  };

  const checkTapReason = async () => {
    if (!setData || selectedAnswer === null) return;
    const slotIndex = currentQuestion;
    const slot = mainSlots[slotIndex];
    if (slot?.kind !== 'tap') return;
    const key = tapStateKey(slotIndex);
    if (tapChecking[key]) return;
    // เหตุผลว่างได้: ผู้เรียนกดตรวจโดยไม่พิมพ์ → ส่ง '' ให้เซิร์ฟเวอร์ prefill คำขออธิบายเฉลย
    // (เซิร์ฟเวอร์จะเปลี่ยนเป็นวลีสำเร็จรูปก่อนเรียก AI — ดู tap-reason route)
    const reason = (tapReasons[key] ?? '').trim();
    if (reason.length > MAX_TAP_REASON_LENGTH) return;
    const question = setData.questions[slot.questionIndex];
    const version = (tapRequestVersions.current[key] ?? 0) + 1;
    tapRequestVersions.current[key] = version;
    setTapChecking(current => ({ ...current, [key]: true }));
    setTapReasonErrors(current => { const next = { ...current }; delete next[key]; return next; });
    try {
      const response = await fetch('/api/tests/tap-reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSetId: setId, questionId: question.id, itemIndex: slot.itemIndex,
          selectedAnswer: toStoredAnswer(question, slot, selectedAnswer),
          selectedText: toDisplayedTapText(question, slot, selectedAnswer), reason,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'ตรวจเหตุผลไม่สำเร็จ กรุณาลองอีกครั้ง');
      if (typeof body.data?.isCorrect !== 'boolean') throw new Error('ผลตรวจไม่สมบูรณ์ กรุณาลองอีกครั้ง');
      const result: TapReasonResult = {
        isCorrect: body.data.isCorrect,
        ai: body.data.ai === null ? null : tapAiFeedbackSchema.parse(body.data.ai),
        message: typeof body.data.message === 'string' ? body.data.message : undefined,
      };
      if (tapRequestVersions.current[key] === version) setTapReasonResults(current => ({ ...current, [key]: result }));
    } catch (error) {
      if (tapRequestVersions.current[key] === version) setTapReasonErrors(current => ({
        ...current, [key]: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'ตรวจเหตุผลใช้เวลานาน กรุณาลองอีกครั้ง',
      }));
    } finally {
      if (tapRequestVersions.current[key] === version) setTapChecking(current => ({ ...current, [key]: false }));
    }
  };

  const handleFreeTextAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setAnswers(previous => previous.map((value, index) => index === currentQuestion ? answer : value));
  };

  const handleResetAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = null;
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    const key = tapStateKey(index);
    clearTapFeedback(key);
    clearSlotCheck(index);
    setTapReasons(current => ({ ...current, [key]: '' }));
  };

  // ANSWER HIDING: ข้างหน้าได้ก็ต่อเมื่อข้อปัจจุบันผ่านการตรวจแล้ว — ทั้งปุ่มล่าง
  // (ไม่มีปุ่ม "ข้อต่อไป" ก่อนตรวจ) และการคลิกเลขข้อใน sidebar
  const handleQuestionSelect = (index: number) => {
    if (index > currentQuestion && !isSlotChecked(currentQuestion, mainSlots[currentQuestion])) return;
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
    if (!isSlotChecked(currentQuestion, mainSlots[currentQuestion])) return;
    if (currentQuestion < mainSlots.length - 1) {
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
          preview: previewMode,
          startedAt: testStartedAt,
          answers: buildTestSubmissionAnswers(setData.questions, mainSlots, answers, toStoredAnswer),
          // ส่งเหตุผลที่พิมพ์ไปเก็บด้วย — server เก็บเฉพาะที่มีข้อความจริง (รอ admin ให้คะแนน)
          // ข้อเดียวกันมีหลายข้อย่อยได้ → ต้องรวมเป็น record เดียวต่อ questionId ไม่ให้ทับกัน
          tapReasons: groupTapReasonsByQuestion(
            mainSlots.map((_, slotIndex) => ({
              slotIndex,
              reason: tapReasons[tapStateKey(slotIndex)] ?? '',
            })),
            mainSlots,
            setData.questions
          ),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScore(data.data.correctAnswers);
        setScoredTotal(data.data.totalQuestions ?? setData.questions.length);
        setResults(data.data.results ?? []);
        setAttemptId(data.data.attemptId ?? null);
        setIsFinished(true);
        // Track test_submitted
        if (posthog && testStartedAtRef.current > 0) {
          const totalQuestions = data.data.totalQuestions ?? mainSlots.length;
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

  // Submit entry point:
  // - has unanswered questions → confirm modal first (unless force, e.g. timer)
  // - otherwise submit immediately
  const handleSubmit = async (force = false) => {
    if (!setData || submitting) return;

    const unanswered = answers.filter((a) => a === null).length;

    if (!force && unanswered > 0) {
      setUnansweredCount(unanswered);
      setShowSubmitConfirm(true);
      return;
    }
    executeSubmit();
  };

  const handleTimeUp = () => {
    void handleSubmit(true);
  };

  // ─── Render guards ────────────────────────────────────────────────

  if (maintenanceBlocked) return <Spinner />; // กำลัง redirect ไปหน้า maintenance
  if (loading || status === 'loading' || !explainsLoaded) return <Spinner />;

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

  // รายการเฉลยรายข้อสำหรับหน้า result (Figma 75:70717) — ข้ามคำตอบที่เข้ารหัสเป็น
  // JSON (Tap & Select / ช่องเติมคำในบทความ) เพราะรูปแบบ chip แสดงคำตอบสั้น ๆ ไม่ได้
  const reviewItems = results
    .filter((result) => !result.userAnswer.trim().startsWith('{'))
    .map((result, rowIndex) => {
      const question = setData.questions.find((item) => item.id === result.questionId);
      if (!question) return null;
      return {
        index: rowIndex + 1,
        questionText: question.questionText,
        userAnswer: getChoiceOptionText(question, result.userAnswer),
        correctAnswer: getChoiceOptionText(question, result.correctAnswer),
        isCorrect: result.isCorrect,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

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
    // ทำชุดใหม่ = เห็นหน้า intro ของทุกเรื่องอีกครั้ง
    seenTopics.current.clear();
    setIntroQueue([]);
    Object.keys(tapRequestVersions.current).forEach(key => { tapRequestVersions.current[key] += 1; });
    setTapReasons({});
    setTapReasonResults({});
    setTapReasonErrors({});
    setTapChecking({});
    setCheckedSlots({});
    setCheckingSlot({});
    setCheckErrors({});
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
          sectionId={sectionId}
        />
      );
    }
    return (
      <>
      <FormMeaningQuiz
        questions={setData.questions}
        reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: openReviewMode } : undefined}
        sectionId={sectionId}
        setId={setId}
        setName={setData.name}
        availableSets={availableSets}
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
        sectionIcon={(SECTION_HEADER[sectionId] ?? SECTION_HEADER['focus-form']).icon}
        sectionColor={(SECTION_HEADER[sectionId] ?? SECTION_HEADER['focus-form']).color}
        headerTitle={setData.name}
        durationMinutes={setData.duration ?? undefined}
        setNumber={currentSetIndex >= 0 ? currentSetIndex + 1 : 1}
        sectionId={sectionId}
        reviewItems={reviewItems}
      />
    );
  }

  // Layout positions are virtual item slots. Tap & Select groups expand to
  // one slot per item, so navigation and answer progress stay item-granular.
  const activeSlotIndex = currentQuestion;
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

  const layoutTotal = mainSlots.length;
  const layoutCurrent = currentQuestion;
  const layoutAnswers = answers;

  // ─── ANSWER HIDING: ปุ่มหลัก + เฉลยของ slot ปัจจุบัน ───────────────
  // ข้อที่ผู้เรียนตอบแล้วต้องกด "ตรวจคำตอบ" ก่อนจึงจะข้างหน้าได้ (handleNext /
  // handleQuestionSelect บล็อกไว้) ส่วนข้อที่ยังไม่ตอบข้ามได้เหมือนเดิม
  // เฉลยของข้อเลือกมาจาก check-answer (payload ไม่มีเฉลย) — โหมดพรีวิวของแอดมิน
  // ยังเห็นเฉลยจาก payload ได้เหมือนเดิม
  const activeCheck = checkedSlots[activeSlotIndex];
  const activeTapResult = activeSlot.kind === 'tap' ? tapReasonResults[tapStateKey(activeSlotIndex)] : undefined;
  const activeChecked = activeSlot.kind === 'tap' ? activeTapResult !== undefined : activeCheck !== undefined;
  const activeCheckBusy = activeSlot.kind === 'tap'
    ? Boolean(tapChecking[tapStateKey(activeSlotIndex)])
    : Boolean(checkingSlot[activeSlotIndex]);
  const activeCheckError = activeSlot.kind === 'tap'
    ? tapReasonErrors[tapStateKey(activeSlotIndex)]
    : checkErrors[activeSlotIndex];
  const activeAnswered = Boolean((answers[activeSlotIndex] ?? '').toString().trim());
  const isLastSlot = activeSlotIndex >= layoutTotal - 1;
  /** เฉลยที่ส่งเข้าการ์ด — null คือยังไม่ตรวจ การ์ดจะไม่เฉลยให้เห็น */
  const revealedCorrectKey = activeSlot.kind === 'tap'
    ? displayedCorrectAnswer
    : activeChecked && !previewMode
      ? getDisplayedChoiceAnswer(activeCheck?.correctKey ?? null, questionChoices)
      : previewMode ? displayedCorrectAnswer : null;
  const revealedExplanation = activeSlot.kind === 'tap'
    ? null
    : activeChecked ? activeCheck?.explanation ?? null : previewMode ? question.explanation ?? null : null;

  const primaryAction = {
    // ปุ่มล่างปุ่มเดียว: เลือกคำตอบ → กดตรวจ → เฉลย → ข้างหน้า
    // "ข้อต่อไป" ไม่มีให้เห็นก่อนตรวจ และปุ่ม disabled ตอนยังไม่ได้เลือกคำตอบ
    label: !activeChecked ? 'ตรวจคำตอบ' : isLastSlot ? 'ส่งคำตอบ' : 'ข้อต่อไป',
    disabled: !activeChecked ? !activeAnswered || activeCheckBusy || submitting : activeCheckBusy || submitting,
    onClick: () => {
      if (!activeChecked) {
        if (activeSlot.kind === 'tap') void checkTapReason();
        else void checkSlotAnswer();
        return;
      }
      if (isLastSlot) { void handleSubmit(); return; }
      handleNext();
    },
  };

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
    </>
  );

  // ขึ้นเรื่องแรกของชุด → เด้งหน้าเนื้อหาอธิบายเต็มจอ (UI เดียวกับ "โหมดทบทวน")
  // ปิดแล้วเข้าข้อสอบต่อได้ทันที · หน้าการ์ด intro รายเรื่องถูกลบไปแล้ว (ไม่ใช้แล้ว)
  const topicGate = introQueue.length > 0 ? (
    <TestExplainOverlay
      key={introQueue[0].id}
      explain={introQueue[0]}
      open
      sectionId={sectionId}
      onClose={() => setIntroQueue((queue) => queue.slice(1))}
    />
  ) : null;

  // ─── Mixed form-meaning blank slot ────────────────────────────────
  if (articleBlank && activeSlot?.kind === 'article') {
    const articleText = question.article?.text ?? '';
    const readableText = question.article?.blanks.reduce(
      (text, blank) => text.replaceAll(`{{${blank.id}}}`, '_____'),
      articleText
    ) ?? articleText;
    return (
      <TestLayout
        notice={previewNotice}
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
        primaryAction={primaryAction}
      >
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-slate-800">{question.article?.title || question.questionText}</h2>
          <p className="whitespace-pre-line text-base leading-8 text-slate-700">{readableText}</p>
          <label className="block text-sm font-semibold text-slate-700">
            ข้อ {activeSlot.blankId}: เติมคำตอบ
            <input
              value={selectedAnswer ?? ''}
              onChange={event => handleFreeTextAnswer(event.target.value)}
              disabled={submitting || activeChecked}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-blue-400 focus:outline-none"
              placeholder={articleBlank.hint || 'พิมพ์คำตอบ'}
            />
          </label>
          {/* ช่องกรอกคำไม่มีการ์ดสีถูก/ผิดเหมือนข้อเลือก จึงต้องบอกผลตรวจเอง */}
          {activeCheckError && <p role="alert" className="text-sm font-medium text-red-600">{activeCheckError}</p>}
          {activeChecked && activeCheck && (
            <p role="status" className="text-sm font-medium text-emerald-700">
              {activeCheck.isCorrect ? 'ถูกต้อง' : `ยังไม่ถูก — คำตอบคือ “${activeCheck.correctText}”`}
            </p>
          )}
        </div>
        {modalsFragment}
        {topicGate}
      </TestLayout>
    );
  }

  // ─── Tap & Select item ───────────────────────────────────────────
  if (tapItem) {
    const key = tapStateKey(activeSlotIndex);
    const reason = tapReasons[key] ?? '';
    const result = tapReasonResults[key];
    const checking = tapChecking[key] ?? false;
    const continueAfterFeedback = () => layoutCurrent < layoutTotal - 1 ? handleNext() : void handleSubmit();
    // เฉลยสำหรับโหมดพรีวิวของแอดมินเท่านั้น — ของผู้เรียนมาจาก checkTapReason
    const slotItem = activeSlot && activeSlot.kind === 'tap' ? question.tapExercise?.items[activeSlot.itemIndex] : undefined;
    const correctChoice = tapCorrectChoice(slotItem);
    const storedChoice = selectedAnswer === null ? null : toStoredAnswer(question, activeSlot!, selectedAnswer);
    const choiceIsCorrect = storedChoice !== null && correctChoice !== null ? storedChoice === correctChoice : null;
    return (
      <>
        <TestLayout
          notice={previewNotice}
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
          primaryAction={{
            ...primaryAction,
            label: checking && primaryAction.label === 'ตรวจคำตอบ' ? 'กำลังตรวจ…' : primaryAction.label,
          }}
          reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: openReviewMode } : undefined}
        >
          <TestTapSelectCard
            key={`${question.id}-${activeSlot.kind === 'tap' ? activeSlot.itemIndex : ''}`}
            title={question.tapExercise?.title ?? question.questionText}
            hint={question.tapExercise?.hint}
            item={tapDisplay?.item ?? tapItem!}
            itemIndex={activeSlot.kind === 'tap' ? activeSlot.itemIndex : 0}
            selectedAnswer={selectedAnswer}
            onAnswer={handleAnswer}
            // เฉลยคำตอบมาจากผลตรวจ (หรือ payload ในโหมดพรีวิว) — ไม่เฉลยทันทีที่เลือก
            answerIsCorrect={previewMode ? choiceIsCorrect : result?.isCorrect ?? null}
            note={reason}
            onNoteChange={value => { clearTapFeedback(key); setTapReasons(current => ({ ...current, [key]: value })); }}
            feedback={result}
            checking={checking}
            error={tapReasonErrors[key]}
            onSkipFeedback={tapReasonErrors[key] ? continueAfterFeedback : undefined}
            disabled={submitting}
          />
          {modalsFragment}
        </TestLayout>
        <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
        {topicGate}
      </>
    );
  }

  // ─── Listening ───────────────────────────────────────────────────
  if (sectionId === 'listening') {
    return (
      <>
      <TestLayout
        notice={previewNotice}
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
        sectionIcon={Headphones}
        sectionColor="from-orange-500 to-amber-500"
        sectionLabel="Listening"
        onResetAnswer={handleResetAnswer}
        primaryAction={primaryAction}
        reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: openReviewMode } : undefined}
      >
        <ListeningAudioPlayer
          key={question.id}
          audioUrl={question.audioUrl ?? undefined}
          transcript={question.transcript ?? question.questionText}
          questionText={question.questionText}
          options={questionChoices}
          selectedAnswer={selectedAnswer}
          // เฉลยมาหลังกด "ตรวจคำตอบ" เท่านั้น
          correctAnswer={revealedCorrectKey}
          explanation={revealedExplanation ?? (revealedCorrectKey ? 'See transcript above.' : null)}
          onAudioPlayed={() => setAudioPlayedMap(prev => ({ ...prev, [currentQuestion]: true }))}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
        />
        {activeCheckError && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{activeCheckError}</p>}
        {modalsFragment}
      </TestLayout>
      <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
      {topicGate}
      </>
    );
  }

  // ─── Focus Meaning ────────────────────────────────────────────────
  if (sectionId === 'focus-meaning') {
    return (
      <>
      <TestLayout
        notice={previewNotice}
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
        sectionIcon={BookOpen}
        sectionColor="from-emerald-500 to-teal-500"
        onResetAnswer={handleResetAnswer}
        primaryAction={primaryAction}
        reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: openReviewMode } : undefined}
      >
      <FocusFormQuestionCard
          key={question.id}
          questionText={question.questionText}
          options={questionChoices}
          selectedAnswer={selectedAnswer}
          // เฉลยมาหลังกด "ตรวจคำตอบ" เท่านั้น
          correctAnswer={revealedCorrectKey}
          explanation={revealedExplanation}
          conversation={question.conversation ?? null}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
          accent="emerald"
        />
        {activeCheckError && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{activeCheckError}</p>}
        {modalsFragment}
      </TestLayout>
      <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
      {topicGate}
      </>
    );
  }

  // ─── Focus Form (default MCQ) ─────────────────────────────────────
  const options: Option[] = questionChoices;
  // หลังส่งคำตอบเสร็จ (ผลจากเซิร์ฟเวอร์) หรือโหมดพรีวิว → ใช้เฉลยได้เลย
  // ระหว่างทำข้อสอบ เฉลยมาจาก check-answer หลังผู้เรียนกด "ตรวจคำตอบ" เท่านั้น
  const correctAnswer = revealedCorrectKey ?? results[currentQuestion]?.correctAnswer ?? null;
  const explanation = revealedExplanation ?? results[currentQuestion]?.explanation ?? null;

  return (
    <>
    <TestLayout
      notice={previewNotice}
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
      primaryAction={primaryAction}
      reviewAction={testExplain ? { label: 'โหมดทบทวน', onClick: openReviewMode } : undefined}
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
      {activeCheckError && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{activeCheckError}</p>}
      {modalsFragment}
    </TestLayout>
    <TestExplainOverlay explain={testExplain} open={showTestExplain} sectionId={sectionId} onClose={() => setShowTestExplain(false)} />
    {topicGate}
    </>
  );
}

