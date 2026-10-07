'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { usePostHog } from '@/lib/posthog';
import { apiFetch } from '@/lib/api-fetch';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import TestResultsDemo from './TestResultsDemo';

/** หนึ่งแถวในรายการ "เฉลยและทบทวนข้อสอบ" (Figma 75:70726) */
export interface ReviewItem {
  /** เลขข้อแบบ 1-based ที่แสดงใน index-badge */
  index: number;
  questionText: string;
  userAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
}

/**
 * คำอธิบายทักษะที่คุณสอบไป แยกตาม section
 * - 'focus-form' มาจากดีไซน์โดยตรง (node 75:70702)
 * - อีก 3 ค่าเป็นฉบับร่างที่ยังไม่ได้ยืนยันจากดีไซน์ — ต้องให้ดีไซน์เช็กอีกครั้ง
 */
const SECTION_SKILL_LABEL: Record<string, string> = {
  'focus-form': 'ทักษะความเข้าใจไวยากรณ์',
  'focus-meaning': 'ทักษะการเข้าใจความหมายของศัพท์',
  'form-meaning': 'ทักษะไวยากรณ์และความหมายของภาษา',
  listening: 'ทักษะการฟังและเข้าใจภาษาพูด',
  // ข้อความกำกับของ Full Test (ไม่มีในเฟรม Figma ของการ์ดคะแนน 75:70702 ซึ่งทำไว้เฉพาะพาร์ทเดี่ยว)
  'full-test': 'ทักษะภาษาอังกฤษครบทั้ง 4 พาร์ท',
};
/** บรรทัดที่สองของการ์ดคะแนน — ข้อความตามดีไซน์ (node 75:70702) */
const SKILL_OUTCOME_LABEL = 'และความหมายของคุณอยู่ในเกณฑ์สูงมาก';

const RATINGS = [1, 2, 3, 4, 5];
/** จำกัดความยาวความคิดเห็นให้ตรงกับ zod ที่ /api/tests/feedback ใช้ (max 1000) */
const COMMENT_MAX_LENGTH = 1000;
/** หยุดการ์ดไว้ให้ผู้ใช้เห็นค่าที่เลือกก่อนสลับไปการ์ดเขียนความคิดเห็น */
const RATING_CONFIRM_MS = 700;
/** ระยะเวลา fade ของการ์ดคะแนนก่อนเปลี่ยนเป็นการ์ดเขียนความคิดเห็น */
const RATING_FADE_MS = 300;

type FeedbackStage = 'rating' | 'comment' | 'sent';

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  isDemo?: boolean;
  attemptId?: number | null;
  onRestart: () => void;
  sectionIcon?: React.ElementType;
  sectionColor?: string;
  headerTitle?: string;
  durationMinutes?: number;
  setNumber?: number;
  /** ใช้เลือกคำอธิบายทักษะในการ์ดคะแนน */
  sectionId?: string;
  /** รายการเฉลยรายข้อ — การ์ดเฉลยจะไม่แสดงเมื่อไม่มีข้อมูล */
  reviewItems?: ReviewItem[];
  /** ระดับ CEFR จาก server (Full Test คำนวณแบบถ่วงน้ำหนัก) — ถ้าไม่ส่งจะประมาณจาก percentage เหมือนเดิม */
  cefrLevel?: string | null;
  /** เนื้อหาเสริมเฉพาะพาร์ท (เช่น สัดส่วนตามพาร์ทของ Full Test) — แสดงหลังการ์ดให้คะแนน ก่อนการ์ดเฉลย */
  extraContent?: React.ReactNode;
}

/**
 * หน้าผลสอบของผู้ใช้จริง (Figma node 75-70682 "Focus on Form")
 * - โครงคอลัมน์กว้าง 704px กลางจอ พื้น #f7f7f7
 * - การ์ดคะแนน 352px · การ์ดให้คะแนน 114px · การ์ดเฉลย · แถบล่าง 97px
 * หน้า demo ยังใช้ UI เดิมที่ ./TestResultsDemo
 */
export default function TestResults({
  score,
  totalQuestions,
  isDemo = false,
  attemptId,
  onRestart,
  sectionIcon,
  sectionColor,
  headerTitle,
  durationMinutes,
  setNumber,
  sectionId,
  reviewItems,
  cefrLevel: cefrLevelOverride,
  extraContent,
}: TestResultsProps) {
  const posthog = usePostHog();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  // ขั้นของการ์ดผลตอบกลับ: ให้คะแนน → (หยุดให้เห็นค่าที่เลือกชั่วครู่) → เขียนความคิดเห็น → ขอบคุณ
  const [feedbackStage, setFeedbackStage] = useState<FeedbackStage>('rating');
  /** true = การ์ดคะแนนกำลัง fade ออกก่อนเปลี่ยนเป็นการ์ดเขียนความคิดเห็น */
  const [ratingFading, setRatingFading] = useState(false);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackTimers = () => {
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  };

  useEffect(() => clearFeedbackTimers, []);

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const cefrLevel = cefrLevelOverride ?? estimateCefrLevel(percentage);
  const skillLabel = SECTION_SKILL_LABEL[sectionId ?? 'focus-form'];
  // แถบบนสุดนับ "ทำครบกี่ข้อ" — ถ้ามีเฉลยรายข้อให้ยึดตามจำนวนข้อที่ตอบจริง
  const hasReviewList = !!reviewItems?.length;
  const answeredCount = hasReviewList
    ? reviewItems!.filter((item) => (item.userAnswer ?? '').trim() !== '').length
    : totalQuestions;
  const answeredTotal = hasReviewList ? reviewItems!.length : totalQuestions;
  const answeredPercent = answeredTotal > 0 ? (answeredCount / answeredTotal) * 100 : 0;

  useEffect(() => {
    posthog?.capture('test_result_viewed', {
      score_percentage: percentage,
      passed: percentage >= 70,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // หน้า demo ยังคง UI เดิมไว้ตามเดิม
  if (isDemo) {
    return (
      <TestResultsDemo
        score={score}
        totalQuestions={totalQuestions}
        onRestart={onRestart}
        sectionIcon={sectionIcon}
        sectionColor={sectionColor}
        headerTitle={headerTitle}
        durationMinutes={durationMinutes}
        setNumber={setNumber}
      />
    );
  }

  const handleRating = async (value: number) => {
    const previous = rating;
    setRating(value);
    posthog?.capture('test_result_rated', { rating: value, score_percentage: percentage });
    if (!attemptId) return;
    try {
      const res = await apiFetch('/api/tests/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, rating: value }),
      });
      if (!res.ok) throw new Error('feedback request failed');
      // ให้ผู้ใช้เห็นค่าที่เลือกก่อน แล้วค่อย fade ออกไปเป็นการ์ดเขียนความคิดเห็น
      clearFeedbackTimers();
      swapTimerRef.current = setTimeout(() => {
        setRatingFading(true);
        fadeTimerRef.current = setTimeout(() => setFeedbackStage('comment'), RATING_FADE_MS);
      }, RATING_CONFIRM_MS);
    } catch {
      clearFeedbackTimers();
      setRatingFading(false);
      setRating(previous);
      toast.error('บันทึกคะแนนไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  };

  /** ส่งความคิดเห็นต่อจากคะแนน — endpoint เดียวกัน upsert และคงค่า rating เดิมไว้ */
  const handleCommentSubmit = async () => {
    const text = comment.trim();
    if (!text || !attemptId || !rating || sendingComment) return;
    setSendingComment(true);
    try {
      const res = await apiFetch('/api/tests/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, rating, comment: text }),
      });
      if (!res.ok) throw new Error('feedback request failed');
      setComment('');
      setFeedbackStage('sent');
      toast.success('ส่งความคิดเห็นแล้ว ขอบคุณครับ');
    } catch {
      toast.error('ส่งความคิดเห็นไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7f7f7] pb-[145px]">
      <div className="mx-auto flex w-full max-w-[704px] flex-col items-center gap-[15px] px-4 py-[15px] sm:px-0">
        {/* แถบความคืบหน้าด้านบน — 75:70684 */}
       <div className="flex h-[48px] w-full items-center rounded-[16px] bg-white px-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
  {/* Progress bar */}
  <div className="relative h-[14px] flex-1 overflow-hidden rounded-full bg-[#E9E9E9] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
    {/* Progress */}
    <div
      className="relative h-full overflow-hidden rounded-full bg-[#58CC02] transition-[width] duration-300 ease-out"
      style={{ width: `${answeredPercent}%` }}
    >
      {/* Highlight */}
      <div className="absolute left-0 top-0 h-[5px] w-full rounded-full bg-white/35" />
    </div>
  </div>

  {/* Counter */}
  <div className="ml-3 flex h-[26px] min-w-[54px] items-center justify-center rounded-full bg-[#F3F7EF] px-2.5">
    <span className="text-[11px] font-extrabold leading-none tracking-[0.4px] text-[#4A633F]">
      {answeredCount}/{answeredTotal}
    </span>
  </div>
</div>

        {/* การ์ดคะแนน — 75:70692 (704 × 352) */}
        <div className="relative flex min-h-[352px] w-full flex-col items-center overflow-hidden rounded-[30px] bg-white">
          {/* เบลอสีจากดีไซน์ 75:70693-70695 */}
          <div className="pointer-events-none absolute left-[207px] top-[53px] h-[253px] w-[290px] rounded-full bg-[rgba(255,240,182,0.17)] blur-[39.5px]" />
          <div className="pointer-events-none absolute left-[545px] top-[36px] h-[229px] w-[121px] rounded-full bg-[rgba(182,216,255,0.17)] blur-[39.5px]" />
          <div className="pointer-events-none absolute left-[55px] top-[36px] h-[229px] w-[115px] rounded-full bg-[rgba(182,216,255,0.17)] blur-[39.5px]" />

          <Image
            src="/logo-otter/otter-result.png"
            alt=""
            width={96}
            height={96}
            className="relative mt-[2px] size-24 shrink-0 object-cover"
          />
          <p className="relative mt-[-7px] text-center text-[20px] font-semibold leading-9 tracking-[-0.75px] text-[#5b833e]">
            {`ยินดีด้วย! คุณทำแบบทดสอบครบ ${totalQuestions} ข้อแล้ว  🎉`}
          </p>
          <div className="relative mt-3 flex h-[87px] w-[294px] items-center justify-center rounded-[12px] bg-[#edfce5] px-3 py-1">
            <span className="text-[20px] font-bold leading-4 text-[#2b6c00]">
              ระดับที่ประเมินได้: {cefrLevel}
            </span>
          </div>
          <p className="relative mt-9 w-[434px] max-w-full px-2 text-center text-[13px] leading-[22px] text-[#475569]">
            ได้คะแนน <span className="font-semibold text-[#059669]">{score} / {totalQuestions}</span> (คิดเป็น {percentage}%) {skillLabel}
            <br />
            {SKILL_OUTCOME_LABEL}
          </p>
        </div>

        {/* การ์ดให้คะแนน 1-5 (75:70703) → หยุดให้เห็นค่าที่เลือก → ช่องเขียนความคิดเห็น (75:71256)
            → หลังส่งแล้วเป็นแถบขอบคุณ (75:71475) · แสดงเฉพาะเมื่อมี attempt */}
        {attemptId && (
        feedbackStage === 'rating' ? (
          /* การ์ดให้คะแนน 1-5 — 75:70703 · หลังกดจะแสดงค่าที่เลือก (cumulative fill) ชั่ว RATING_CONFIRM_MS */
          <div
            className={`flex h-[114px] w-full flex-col items-center rounded-[20px] bg-white px-[25px] py-[10px] transition-opacity duration-300 ${
              ratingFading ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex w-full flex-col items-center gap-[10px]">
              <p className="w-full text-center text-[16px] font-semibold leading-7 text-[#4a4a4a]">
                CEFR Ready ช่วยคุณได้มากน้อยแค่ไหน ?
              </p>
              <div
                className="flex w-full items-center gap-4"
                role="radiogroup"
                aria-label="ให้คะแนนความพอใจ 1 ถึง 5"
              >
                {RATINGS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    onClick={() => handleRating(value)}
                    className={`flex h-[46px] flex-1 items-center justify-center rounded-[10px] border text-center text-[18px] font-semibold leading-7 transition-colors ${
                      rating !== null && value <= rating
                        ? 'border-[#ffdb40] bg-[#fff0ae] text-[#574924]'
                        : 'border-transparent bg-[#f3f3f3] text-[#909090]'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : feedbackStage === 'sent' ? (
          /* หลังส่งความคิดเห็นแล้ว — แถบขอบคุณ 75:71475 */
          <div className="flex h-[48px] w-full items-center justify-center gap-[7px] rounded-[13px] bg-white px-3 py-2">
            <p className="shrink-0 text-[16px] font-semibold leading-5 text-[#628978]">
              CEFR Ready ขอขอบคุณครับ
            </p>
            <Image src="/icons/heart.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
          </div>
        ) : (
          /* หลังให้คะแนนแล้ว — ช่องเขียนความคิดเห็น 75:71256 */
          <div className="flex h-[125px] w-full flex-col items-center rounded-[20px] bg-white px-[25px] pb-[10px] pt-[11px]">
            <div className="flex w-full flex-col items-center gap-[6px]">
              <p className="w-full text-left text-[16px] font-semibold leading-7 text-[#4a4a4a]">
                เสียงของคุณ จะช่วยมอบความหวังให้ผู้อื่นต่อไป
              </p>
              <div className="flex w-full items-center justify-end gap-4">
                <input
                  type="text"
                  value={comment}
                  maxLength={COMMENT_MAX_LENGTH}
                  onChange={(event) => setComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleCommentSubmit();
                  }}
                  placeholder="ช่วยเขียนความคิดเห็น หรือประสบการณ์ใช้งานสั้นๆก็ได้ครับ"
                  aria-label="ช่วยเขียนความคิดเห็น หรือประสบการณ์ใช้งานสั้นๆ"
                  className="flex h-[56px] min-w-0 flex-1 items-center rounded-[10px] border border-[#dcdcdc] bg-white py-0.5 pl-3 pr-[11px] text-[14px] font-medium text-[#000000] outline-none placeholder:text-[#9e9e9e]"
                />
                <button
                  type="button"
                  onClick={() => void handleCommentSubmit()}
                  disabled={!comment.trim()}
                  aria-label="ส่งความคิดเห็น"
                  className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f8f3e2] disabled:opacity-50"
                >
                  <Image src="/icons/send.svg" alt="" width={17} height={17} className="size-[17px] text-black" />
                </button>
              </div>
            </div>
          </div>
        )
        )}

        {extraContent}

        {/* การ์ดเฉลยและทบทวนข้อสอบ — 75:70717 */}
        {hasReviewList && (
          <div className="w-full rounded-[30px] bg-white pb-6 pl-6 pr-[23px] pt-[18px]">
            <div className="flex flex-col items-center">
              <div className="flex w-full items-center">
                <h2 className="text-[18px] font-semibold leading-7 text-[#4a4a4a]">เฉลยและทบทวนข้อสอบ</h2>
              </div>
              <div className="w-full rounded-[18px] bg-[#e6f0f8] pb-5 pl-[18px] pr-[17px] pt-[21px]">
                <div className="flex w-full flex-col items-start gap-3">
                  {reviewItems.map((item) => (
                    <div
                      key={item.index}
                      className="flex w-full items-center gap-4 rounded-[12px] bg-white p-[18px]"
                    >
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[14px] font-bold ${
                          item.isCorrect ? 'bg-[#edfce5] text-[#58cc02]' : 'bg-[#fef2f2] text-[#f87171]'
                        }`}
                      >
                        {item.index}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                        <p className="w-full text-[15px] font-semibold leading-[18px] text-[#1e293b]">
                          {item.questionText}
                        </p>
                        <div className="flex w-full flex-wrap items-center gap-2">
                          <p className="text-[13px] font-medium leading-4 text-[#64748b]">Your answer:</p>
                          <span
                            className={`flex items-start rounded px-2 py-0.5 text-[13px] font-bold leading-4 ${
                              item.isCorrect ? 'bg-[#edfce5] text-[#58cc02]' : 'bg-[#fef2f2] text-[#f87171]'
                            }`}
                          >
                            {item.userAnswer || '-'}
                          </span>
                          {!item.isCorrect && item.correctAnswer && (
                            <>
                              <p className="text-[13px] font-medium leading-4 text-[#64748b]">• Correct:</p>
                              <span className="flex items-start rounded bg-[#edfce5] px-2 py-0.5 text-[13px] font-bold leading-4 text-[#58cc02]">
                                {item.correctAnswer}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div
                        className={`flex size-6 shrink-0 items-center justify-center rounded-[12px] ${
                          item.isCorrect ? 'bg-[#58cc02]' : 'bg-[#f87171]'
                        }`}
                      >
                        <Image
                          src={item.isCorrect ? '/icons/check.svg' : '/icons/x-circle.svg'}
                          alt=""
                          width={14}
                          height={14}
                          className="size-[14px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* แถบล่าง — 75:70789 (97px) */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex h-[97px] items-center justify-center bg-white pb-8 pt-4 drop-shadow-[0px_0px_3.3px_rgba(172,172,172,0.25)]"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-center gap-4 md:gap-[270px]">
          <button
            onClick={onRestart}
            className="flex h-[48px] w-[213px] shrink-0 items-center justify-center rounded-[10px] border border-[#eaeaea] bg-white px-5 py-3 text-center text-[16px] font-semibold text-[#524924] shadow-[3px_3px_0px_#d5d3d3]"
          >
            ทำอีกครั้ง
          </button>
          <Link
            href="/tests"
            aria-label="จบการสอบ"
            className="flex h-[49px] w-[216px] shrink-0 items-center justify-center rounded-[14px] border border-[#ffdb40] border-b-4 border-r-[3px] bg-[#fff0ae] px-[11px] py-[10px] text-center text-[16px] font-semibold text-[#524924]"
          >
            จบการสอบ
          </Link>
        </div>
      </div>
    </div>
  );
}
