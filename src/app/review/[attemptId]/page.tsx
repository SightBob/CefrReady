'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import FormMeaningFillCard from '@/components/FormMeaningFillCard';
import ListeningAudioPlayer from '@/components/ListeningAudioPlayer';
import TestTapSelectCard from '@/components/TestTapSelectCard';
import type { TapExerciseData } from '@/lib/test-set-slots';
import { buildReviewRailCells, sortReviewItemsByOrder } from '@/lib/review-rail';
import { usePostHog } from '@/lib/posthog';
import type { TestTypeId, ConversationLine, Article } from '@/types/test';

interface AttemptData {
  id: number;
  testTypeId: TestTypeId;
  testTypeName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  completedAt: string | null;
}

interface ReviewItem {
  questionId: number;
  question: {
    id: number;
    testTypeId: TestTypeId | string;
    questionText: string;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
    correctAnswer: string | null;
    explanation: string | null;
    conversation: ConversationLine[] | null;
    audioUrl: string | null;
    transcript: string | null;
    article: Article | null;
    tapExercise: TapExerciseData | null;
    cefrLevel: string;
    difficulty: string | null;
    orderIndex: number;
  } | null;
  userAnswer: string;
  isCorrect: boolean;
}

interface ReviewResponse {
  success: boolean;
  error?: string;
  data?: {
    attempt: AttemptData;
    reviewItems: ReviewItem[];
  };
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const posthog = usePostHog();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const skipScrollRef = useRef(true);
  const mobileNavTrackRef = useRef<HTMLDivElement>(null);

  const fetchReviewData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/attempts/${params.attemptId}`);
      const data: ReviewResponse = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load review');
        return;
      }

      setAttempt(data.data!.attempt);
      setReviewItems(sortReviewItemsByOrder(data.data!.reviewItems));
      posthog?.capture('test_result_reviewed', {
        attempt_id: params.attemptId,
      });
    } catch (err) {
      setError('Failed to load review data');
    } finally {
      setLoading(false);
    }
  }, [params.attemptId, posthog]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated' && params.attemptId) {
      fetchReviewData();
    }
  }, [status, params.attemptId, router, fetchReviewData]);

  // เปลี่ยนข้อ = หน้าจอยาว ๆ เลื่อนกลับขึ้นบนสุดเสมอ (ข้ามรอบแรกตอน mount)
  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [currentIndex]);

  // Figma 244:268 — ช่องข้อที่เลือกอยู่ต้องเลื่อนเข้ามาใน track เสมอบนมือถือ
  // (track กว้าง 287px ที่ 390px จึงเห็นแค่ ~4 ช่อง) ใช้ getBoundingClientRect
  // เพราะ offsetLeft ของลูกจะอ้างถึง offsetParent ซึ่งไม่ใช่ตัว track
  const orderedItems = reviewItems;
  const currentItem = orderedItems[currentIndex] ?? null;
  // Figma 200:660 — เติมคอลัมน์แบบ column-major (1,3,5… | 2,4,6…) + ช่องลูกศรท้ายสุด
  const railCells = useMemo(() => buildReviewRailCells(orderedItems.length), [orderedItems.length]);

  useEffect(() => {
    const track = mobileNavTrackRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLElement>('[aria-current="true"]');
    if (!active) return;

    const revealActive = () => {
      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const isFullyVisible =
        activeRect.left >= trackRect.left - 1 && activeRect.right <= trackRect.right + 1;
      if (isFullyVisible) return;
      const delta =
        activeRect.left - trackRect.left - (track.clientWidth - activeRect.width) / 2;
      track.scrollLeft += delta;
    };

    revealActive();
    window.addEventListener('resize', revealActive);
    return () => window.removeEventListener('resize', revealActive);
  }, [currentIndex, orderedItems.length]);

  // ─── Loading Skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f7f7]">        <div className="mx-auto w-full max-w-[1049px] px-[18px] min-[890px]:px-4 min-[1100px]:px-0 pt-[30px] pb-[123px] min-[890px]:pb-[129px]">
          <div className="flex flex-col gap-5 min-[890px]:flex-row min-[890px]:items-start">
            <div className="w-full min-[890px]:w-[189px] shrink-0 rounded-[16px] bg-white p-0 min-[890px]:px-[15px] min-[890px]:pt-6 min-[890px]:pb-[23px]">
            <div className="h-[58px] min-[890px]:h-11 w-full rounded-[7px] bg-slate-100 animate-pulse" />
            <div className="mt-[10px] hidden min-[890px]:grid grid-cols-2 gap-[10px]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-[54px] rounded-[8px] bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="w-full max-w-[840px] mx-auto min-[890px]:mx-0 rounded-[20px] bg-white px-[26px] pt-6 pb-[23px]">
              <div className="h-[87px] w-[87px] mx-auto rounded-full bg-slate-100 animate-pulse" />
              <div className="mt-6 h-4 w-2/3 rounded bg-slate-100 animate-pulse" />
              <div className="mt-6 grid grid-cols-1 min-[640px]:grid-cols-2 gap-x-7 gap-y-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-[78px] rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f7f7] flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">{error || 'Review not found'}</p>
          <Link href="/progress" className="text-primary-600 hover:underline mt-2 inline-block">
            กลับหน้าพัฒนาการ
          </Link>
        </div>
      </div>
    );
  }

  const noOp = () => {};
  const hasNext = currentIndex < orderedItems.length - 1;

  return (
    <div className="min-h-[100dvh] bg-[#f7f7f7]">
      {/* Figma 200:587 — rail 189px + การ์ด 840px ชิดกัน 20px */}
      {/* Figma 244:196 — การ์ดขอบจอ 18px บนมือถือ (x=18 กว้าง 355) */}
      <div className="mx-auto w-full max-w-[1049px] px-[18px] min-[890px]:px-4 min-[1100px]:px-0 pt-[30px] pb-[123px] min-[890px]:pb-[129px]">
        <div className="flex flex-col gap-5 min-[890px]:flex-row min-[890px]:items-start">
          {/* Figma 244:338 + 244:341 — ปุ่มปิดวางข้างหัวการ์ดบนมือถือ ตั้งแต่ 890px
              ขึ้นไป wrapper นี้กลายเป็น display:contents → nav กับการ์ดโจทย์ยังเป็นลูก
              ของ flex row เดิมทุกประการ (desktop ไม่เปลี่ยนแม้แต่จุดเดียว) */}
          <div className="flex w-full items-center gap-[10px] min-[890px]:contents">
          <nav
            aria-label="เลือกข้อเพื่อทบทวน"
            className="w-full min-w-0 flex-1 min-[890px]:flex-none min-[890px]:w-[189px] shrink-0 flex flex-col gap-[10px] rounded-[16px] bg-white p-0 min-[890px]:px-[15px] min-[890px]:pt-6 min-[890px]:pb-[23px]"
          >
            {/* หัว rail: ชื่อประเภทข้อสอบ + คะแนน */}
            <div className="flex min-h-[44px] w-full flex-col items-center justify-center gap-[2px] rounded-[7px] bg-[#f3f5f7] px-[10px] py-2">
              <span className="text-center text-[13px] font-semibold leading-6 text-[#525c6c]">
                {attempt.testTypeName}
              </span>
              <span className="text-center text-[11px] leading-4 text-[#8293a9]">
                คะแนน {attempt.score}% · ถูก {attempt.correctAnswers}/{attempt.totalQuestions}
              </span>
            </div>

            {/* มือถือย้ายแถบเลขข้อไปอยู่ในแถบล่างตาม Figma 244:265 แล้ว */}

            {/* เดสก์ท็อป: 2 คอลัมน์ เติมลำดับจากบนลงล่าง (1,3,5… | 2,4,6…) */}
            <div className="hidden w-full min-[890px]:flex gap-[10px] items-start max-h-[462px] overflow-y-auto pr-[2px]" style={{ scrollbarWidth: 'thin' }}>
              {[0, 1].map((column) => (
                <div key={column} className="flex flex-1 min-w-0 flex-col gap-[14px]">
                  {railCells.filter((cell) => cell.column === column).map((cell) =>
                    cell.itemIndex === null ? (
                      <button
                        key={`next-${column}`}
                        type="button"
                        onClick={() => hasNext && setCurrentIndex((i) => i + 1)}
                        disabled={!hasNext}
                        aria-label="ไปข้อถัดไป"
                        className="flex h-[54px] w-full items-center justify-center rounded-[8px] bg-[#f8f8f8] transition-colors hover:bg-[#f0f0f0] disabled:cursor-default disabled:opacity-60"
                      >
                        <Image src="/icon_svg/arrow-forward.svg" alt="" width={16} height={16} className="size-4 shrink-0" />
                      </button>
                    ) : (
                      <RailCell
                        key={orderedItems[cell.itemIndex].questionId}
                        index={cell.itemIndex}
                        isCorrect={orderedItems[cell.itemIndex].isCorrect}
                        isActive={cell.itemIndex === currentIndex}
                        onSelect={() => setCurrentIndex(cell.itemIndex!)}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* Figma 244:341 — ปุ่มปิด 44×40 มุมขวาบน แทนปุ่มย้อนกลับเดิมบนมือถือ */}
          <button
            type="button"
            onClick={() => router.push('/progress')}
            aria-label="กลับหน้าพัฒนาการ"
            className="flex h-10 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white min-[890px]:hidden"
          >
            <Image src="/icon_svg/close.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
          </button>
          </div>

          {/* ── การ์ดโจทย์ 840px ─────────────────────────────────────── */}
          <div className="w-full max-w-[840px] mx-auto min-[890px]:mx-0 min-w-0 min-[640px]:[&_.qc-options]:grid-cols-2">
            {currentItem ? (
              <ReviewQuestionCard item={currentItem} onAnswerSelect={noOp} />
            ) : (
              <div className="rounded-[20px] bg-white px-[26px] py-10 text-center text-sm text-slate-500">
                ไม่มีข้อสอบในครั้งนี้
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────
          มือถือ (<890px)  = Figma 244:265 แถบเลขข้อสูง 91px (6 + 65 + 20) + ลูกศร
          เดสก์ท็อป = ปุ่มย้อนกลับ 97px (16 + 49 + 32) เหมือนเดิมทุกประการ */}
      <div className="fixed bottom-0 left-0 w-full bg-white z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_3.3px_0_rgba(172,172,172,0.25)]">
        {/* Figma 244:267 — track 287px ที่ 390px (ยืด/หดตามจอ) + เส้นคั่น + ช่องลูกศร */}
        <nav aria-label="เลือกข้อเพื่อทบทวน (แถบล่าง)" className="flex flex-col items-center pt-[6px] pb-[20px] min-[890px]:hidden">
          <div className="flex w-full items-center justify-center rounded-[10px] bg-white px-[15px] py-[7px]">
            <div className="flex min-h-px w-full flex-1 items-center gap-[10px]">
              <div
                ref={mobileNavTrackRef}
                className="dot-map-scroll flex h-[51px] min-w-0 flex-1 items-center gap-[10px] overflow-x-auto overflow-y-clip"
                style={{ scrollbarWidth: 'none' }}
              >
                {orderedItems.map((item, index) => (
                  <RailCell
                    key={item.questionId}
                    index={index}
                    isCorrect={item.isCorrect}
                    isActive={index === currentIndex}
                    onSelect={() => setCurrentIndex(index)}
                  />
                ))}
              </div>

              {/* Figma 244:285 — เส้นคั่นแนวตั้ง 32px (asset เดียวกับหน้า exam) */}
              <div className="flex h-[32px] w-0 shrink-0 items-center justify-center" aria-hidden="true">
                <Image src="/tests/nav-divider.svg" alt="" width={32} height={1} className="shrink-0 !max-w-none h-[1px] w-[32px] rotate-90" />
              </div>

              {/* Figma 244:286 — ช่องท้ายพื้น #f3f3f3 ไปข้อถัดไป */}
              <button
                type="button"
                onClick={() => hasNext && setCurrentIndex((i) => i + 1)}
                disabled={!hasNext}
                aria-label="ไปข้อถัดไป"
                className="flex h-[51px] min-w-px w-[53px] shrink-0 items-center justify-center rounded-[8px] bg-[#f3f3f3] transition-colors hover:bg-[#e8e8e8] disabled:cursor-default disabled:opacity-60"
              >
                <Image src="/icon_svg/arrow-forward.svg" alt="" width={16} height={16} className="size-4 shrink-0" />
              </button>
            </div>
          </div>
        </nav>

        <div className="mx-auto w-full max-w-[1049px] px-4 min-[1100px]:px-0 pt-4 pb-8 flex items-center justify-end hidden min-[890px]:flex">
          <button
            type="button"
            onClick={() => router.push('/progress')}
            className="flex-1 min-[890px]:flex-none min-[890px]:w-[216px] h-14 min-[890px]:h-[49px] rounded-[14px] flex items-center justify-center bg-[#FFF0AE] border-b-4 border-r-4 border-[#FFDB40] text-[16px] font-semibold text-[#524924] transition-colors hover:bg-[#FFEA8F]"
          >
            ย้อนกลับ
          </button>
        </div>
      </div>
    </div>
  );
}

/** ช่องเลขข้อบน rail — Figma 200:663-690 (active/done/wrong) */
function RailCell({
  index,
  isCorrect,
  isActive,
  onSelect,
}: {
  index: number;
  isCorrect: boolean;
  isActive: boolean;
  onSelect: () => void;
}) {
  const stateClass = isActive
    ? 'bg-[#719cc0] text-white'
    : isCorrect
      ? 'bg-[#daf2e7] text-[#2a4246] hover:bg-[#c7ecd9]'
      : 'bg-[#f6eaea] text-[#2a4246] hover:bg-[#f0dcdc]';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`ข้อ ${index + 1} — ${isCorrect ? 'ตอบถูก' : 'ตอบผิด'}`}
      className={`flex h-[51px] w-[51.6px] min-[890px]:h-[54px] min-[890px]:w-full shrink-0 items-center justify-center rounded-[8px] px-4 py-2 text-[13px] font-semibold transition-colors ${stateClass}`}
    >
      {index + 1}
    </button>
  );
}

/** Renders the appropriate question card based on test type */
function ReviewQuestionCard({
  item,
  onAnswerSelect,
}: {
  item: ReviewItem;
  onAnswerSelect: (answer: string) => void;
}) {
  const q = item.question;
  if (!q) {
    return (
      <div className="rounded-[20px] bg-white px-[26px] py-6 text-slate-500">
        ไม่พบข้อมูลของข้อนี้
      </div>
    );
  }

  if (q.tapExercise?.items.length) {
    let selected: Record<string, string> = {};
    try { selected = JSON.parse(item.userAnswer); } catch { /* older answer data */ }
    return (
      <div className="space-y-5">
        {q.tapExercise.items.map((tapItem, index) => (
          <TestTapSelectCard
            key={index}
            title={q.tapExercise!.title}
            hint={index === 0 ? q.tapExercise!.hint : undefined}
            item={tapItem}
            itemIndex={index}
            selectedAnswer={selected[String(index)] ?? null}
            onAnswer={onAnswerSelect}
            revealAnswer
            disabled
          />
        ))}
      </div>
    );
  }

  switch (q.testTypeId) {
    case 'focus-form':
      return (
        <FocusFormQuestionCard
          questionText={q.questionText}
          options={[
            { key: 'A', value: q.optionA || '' },
            { key: 'B', value: q.optionB || '' },
            { key: 'C', value: q.optionC || '' },
            { key: 'D', value: q.optionD || '' },
          ]}
          selectedAnswer={item.userAnswer}
          correctAnswer={q.correctAnswer}
          explanation={q.explanation}
          conversation={q.conversation ?? null}
          onAnswerSelect={onAnswerSelect}
          disabled
        />
      );

    case 'focus-meaning': {
      const options = [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''].filter(Boolean);
      const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(item.userAnswer);
      const correctIndex = q.correctAnswer ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer) : -1;

      return (
        <FocusMeaningConversationCard
          conversation={q.conversation || []}
          question={q.questionText}
          options={options}
          selectedAnswer={selectedIndex >= 0 ? selectedIndex : null}
          correctAnswer={correctIndex >= 0 ? correctIndex : null}
          explanation={q.explanation || ''}
          onAnswerSelect={() => {}}
          disabled
        />
      );
    }

    case 'form-meaning': {
      if (q.article) {
        const answers: Record<number, string> = {};

        // Parse user's submitted blank answers (JSON-encoded per-blank)
        try {
          const parsed = JSON.parse(item.userAnswer);
          if (typeof parsed === 'object' && parsed !== null) {
            Object.entries(parsed).forEach(([k, v]) => {
              answers[parseInt(k)] = String(v);
            });
          }
        } catch { /* fallback: show correct answers */ }

        // If no user answers parsed (old data), populate with correct answers
        if (Object.keys(answers).length === 0) {
          q.article.blanks.forEach(blank => {
            answers[blank.id] = blank.correctAnswer.toLowerCase();
          });
        }

        return (
          <FormMeaningFillCard
            article={q.article}
            answers={answers}
            onInputChange={() => {}}
            revealed
            disabled
          />
        );
      }

      return (
        <div className="rounded-[20px] bg-white px-[26px] py-6">
          <p className="text-slate-800">{q.questionText}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-600">Your answer:</span>
            <span className={`font-medium ${item.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
              {item.userAnswer || '(empty)'}
            </span>
            {!item.isCorrect && q.correctAnswer && (
              <span className="text-sm text-emerald-600">
                Correct: {q.correctAnswer}
              </span>
            )}
          </div>
          {q.explanation && (
            <div className={`mt-4 p-4 rounded-xl ${
              item.isCorrect
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <p className="font-medium text-slate-800 mb-1">
                {item.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className="text-slate-600">{q.explanation}</p>
            </div>
          )}
        </div>
      );
    }

    case 'listening':
      return (
        <ListeningAudioPlayer
          audioUrl={q.audioUrl || undefined}
          transcript={q.transcript || q.questionText}
          questionText={q.questionText}
          options={[
            { key: 'A', value: q.optionA || '' },
            { key: 'B', value: q.optionB || '' },
            { key: 'C', value: q.optionC || '' },
            { key: 'D', value: q.optionD || '' },
          ]}
          selectedAnswer={item.userAnswer}
          correctAnswer={q.correctAnswer}
          explanation={q.explanation}
          onAudioPlayed={() => {}}
          onAnswerSelect={onAnswerSelect}
          disabled
        />
      );

    default:
      return (
        <div className="rounded-[20px] bg-white px-[26px] py-6 text-slate-500">
          ไม่รองรับประเภทข้อสอบนี้
        </div>
      );
  }
}
