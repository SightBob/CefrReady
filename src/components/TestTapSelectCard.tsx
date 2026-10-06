'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Lightbulb, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import { MAX_TAP_REASON_LENGTH, UNDERSTANDING_LABELS, type TapReasonResult } from '@/lib/tap-ai';
import type { TapExerciseItem } from '@/lib/test-set-slots';

/** Figma 172:12723 — ข้อความกล่องให้กำลังใจเมื่อตอบถูก */
const AI_PRAISE = 'คุณตอบแม่นยำมาก ถ้าเข้าใจแบบนี้ได้แล้ว สามารถทำข้อสอบได้แน่นอน !';

export default function TestTapSelectCard({
  title,
  hint,
  item,
  itemIndex,
  selectedAnswer,
  onAnswer,
  disabled = false,
  revealAnswer = false,
  answerIsCorrect,
  note: controlledNote,
  onNoteChange,
  feedback,
  checking = false,
  error,
  onSkipFeedback,
}: {
  title: string;
  hint?: string;
  item: Omit<TapExerciseItem, 'correct'> & { correct?: 0 | 1 };
  itemIndex: number;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
  revealAnswer?: boolean;
  answerIsCorrect?: boolean | null;
  note?: string;
  onNoteChange?: (note: string) => void;
  feedback?: TapReasonResult;
  checking?: boolean;
  error?: string;
  onSkipFeedback?: () => void;
}) {
  const [localNote, setLocalNote] = useState('');
  const note = controlledNote ?? localNote;
  const correctAnswer = item.correct === 0 ? 'A' : item.correct === 1 ? 'B' : null;
  const answered = selectedAnswer !== null;
  const isCorrect = correctAnswer !== null && selectedAnswer === correctAnswer;
  // null = ยังไม่ได้ตรวจ (เบราว์เซอร์ไม่มีเฉลยเพราะถูกถอด item.correct ออกก่อนส่ง client)
  // true/false = ผลจากเซิร์ฟเวอร์หลังกด “ตรวจคำตอบ”
  const verifiedAnswer = answerIsCorrect ?? (revealAnswer ? isCorrect : null);

  return (
    // Figma 172:12598 — gap hint→คำถาม 20px (space-y-5); gap ก่อนกล่องเหตุผล 24px
    // เพิ่มทีหลังด้วย pt-1 ในกล่องเหตุผล เพราะ space-y ของพ่อแม่จะถูก override ด้วย mt ของลูก
    <div className="space-y-5 bg-white px-[43px] max-md:px-[20px] py-[33px] max-md:py-[20px] rounded-[20px]">
      {hint?.trim() && (
        // Figma 172:12701 — px 20 / py 16, ไอคอน↔ข้อความ 10px, หัวข้อ↔เนื้อความ 10px
        <section className="flex gap-2.5 rounded-[15px] border-[1.6px] border-[#E9CD62] bg-[#FFFEFA] px-4 py-4 sm:px-5">
          <span className="grid size-[23px] shrink-0 place-items-center rounded-md bg-[#C8E6FF] text-[#006590]">
            <Sparkles size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-2.5">
            <p className="text-sm font-semibold leading-5 text-[#6C5F2D]">คำแนะนำสำหรับข้อนี้</p>
            <p className="whitespace-pre-line text-sm font-medium leading-[21px] text-[#76641C]">{hint}</p>
          </div>
        </section>
      )}

      {/* Figma 172:12686 — หัวข้อกับตัวเลือกห่างกัน 6px */}
      <section className="space-y-1.5">
        <div className="space-y-1.5">
          <h2 className="text-base font-medium leading-8 text-[#1E293B]">{title || 'เลือกคำตอบที่ถูกต้อง'}</h2>
          {item.prompt.trim() && (
            <p className="text-base font-medium leading-[26px] text-[#1E293B]">{itemIndex + 1}. {item.prompt}</p>
          )}
        </div>

        <div className="space-y-[19px]">
          {(['A', 'B'] as const).map((key, index) => {
            const value = index === 0 ? item.choiceA : item.choiceB;
            const isSelected = selectedAnswer === key;            const isAnswer = key === correctAnswer;
            // เขียวเฉพาะตัวที่เลือกและผ่านการตรวจ — ก่อนตอบห้ามบ่งชี้คำตอบถูก
            const badgeIsCorrect = isSelected ? verifiedAnswer === true : Boolean(revealAnswer && isAnswer);
            const stateClass = !answered
  ? 'ring-[#E2E8F0] bg-white'
  : revealAnswer
    ? isAnswer
      ? 'ring-[#E2E8F0] bg-[#ECFDF5]'
      : isSelected
        ? 'ring-[#E2E8F0] bg-[#EEEEEE]'
        : 'ring-transparent bg-[#F8F8F8] opacity-70'
    : isSelected
      // ยังไม่ตรวจ → วงแหวนน้ำเงิน #719CC0 (สี “ข้อที่เลือกอยู่” ของแถบนำทาง) ห้ามใช้เทาของผิด
      ? verifiedAnswer === null
        ? 'ring-[#719CC0] bg-white'
        : verifiedAnswer === true
          ? 'ring-[#E2E8F0] bg-[#ECFDF5]'
          : 'ring-[#E2E8F0] bg-[#EEEEEE]'
      : 'ring-[#E2E8F0] bg-white';

            return (
              <button
                key={key}
                type="button"
                disabled={answered || disabled}
                onClick={() => onAnswer(key)}
                className={`flex min-h-[4.75rem] w-full items-center gap-3 rounded-[14px] ring-[1.6px] ring-inset px-4 py-4 text-left transition-colors ${stateClass}`}
              >
                {/* Figma 172:12690/12696 — กรอบตัวอักษร 28px r8: ถูกต้อง #10B981/ขาว,
                    ยังไม่ตรวจหรือผิด #F1F5F9/#64748B */}
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${badgeIsCorrect ? 'bg-[#10B981] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{key}</span>
                <span className="min-w-0 flex-1 text-base font-medium leading-[26px] text-[#1E293B]">{value}</span>
                {/* ดีไซน์ไม่มีไอคอน ✓/✗ — เก็บข้อความไว้ให้ screen reader อ่านแทน */}
                {isSelected && verifiedAnswer !== null && (
                  <span className="sr-only">{verifiedAnswer ? 'ตัวเลือกถูกต้อง' : 'ตัวเลือกไม่ถูกต้อง'}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* หลังเลือกแล้ว: เฉลยขึ้นทันที — ชวนให้พิมพ์เหตุผลต่อ */}
        {answered && !feedback && (
          <p className="text-[0.8125rem] leading-[19px] text-[#76641C]">
            {verifiedAnswer === null
              ? 'เลือกแล้ว ยังไม่ได้ตรวจ — พิมพ์เหตุผลแล้วกด “ตรวจคำตอบ” เพื่อดูว่าถูกหรือไม่'
              : 'เฉลยแล้ว — พิมพ์เหตุผลของคุณ แล้วกด “ตรวจคำตอบ” ให้ AI ช่วยตรวจ'}
          </p>
        )}

      </section>

      {/* แสดงหลังเลือกคำตอบแล้วเท่านั้น */}
      {/* Figma 172:12726 — gap หัวข้อ↔ช่องพิมพ์ 12px */}
      {answered && (
      <section className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center gap-3.5">
          <h3 className="text-base font-medium leading-8 text-[#1E293B]">เหตุผลที่เลือกข้อนี้</h3>
          {/* Figma 172:12729 — pill h31 r32 pl7 pr17 py6, ไอคอนอยู่ในช่อง 23px, gap 3px */}
          <div className="inline-flex max-w-full items-center gap-[3px] rounded-full bg-[#ECF6FF] pl-[7px] pr-[17px] py-1.5 text-xs font-medium leading-5 text-[#46515F]">
            <span className="grid size-[23px] shrink-0 place-items-center">
              <Lightbulb className="h-[15px] w-[11px] shrink-0 text-[#6D88EE]" aria-hidden="true" />
            </span>
            <span>หากยังไม่แน่ใจคำตอบ ลองเปิด <strong className='text-[#6D88EE]'>“โหมดทบทวน”</strong> เพื่อให้คุณ <strong className='text-[#6D88EE]'>“ทำโจทย์จริงได้”</strong> แบบเข้าใจมากขึ้น</span>
          </div>
        </div>
        {/* Figma 172:12734 — สูง 63px r12 ขอบ 1.6px #E2E8F0, px 16, ช่องดินสอ 28px r8 */}
        <label className="flex min-h-[3.9375rem] w-full items-center gap-3 rounded-xl border-[1.6px] border-[#E2E8F0] bg-white px-4 py-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F1F5F9]">
            <Pencil size={16} className="shrink-0 text-[#9A9A9A]" aria-hidden="true" />
          </span>
          <input
            type="text"
            value={note}
            onChange={event => onNoteChange ? onNoteChange(event.target.value) : setLocalNote(event.target.value)}
            disabled={disabled || checking || revealAnswer}
            maxLength={MAX_TAP_REASON_LENGTH}
            placeholder="เขียนเหตุผลสั้นๆ แล้วกดตรวจคำตอบ"
            aria-label="เหตุผลที่เลือกข้อนี้"
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-[#1E293B] placeholder:text-[#9A9A9A] focus:outline-none"
          />
        </label>
        <p className="flex items-center gap-1.5 text-xs text-slate-400"><RotateCcw size={12} /> ใช้ฝึกความเข้าใจ ไม่เปลี่ยนคะแนนสอบ · {note.length}/{MAX_TAP_REASON_LENGTH}</p>
        {onNoteChange && <p className="text-sm leading-6 text-slate-500">เหตุผลและโจทย์จะถูกส่งไปตรวจผ่าน OpenRouter เมื่อผู้ดูแลเปิด AI กรุณาไม่ใส่ข้อมูลส่วนตัว</p>}
        {checking && <p role="status" className="text-sm text-slate-500">AI กำลังตรวจความเข้าใจ…</p>}
        {error && <div role="alert" className="space-y-3 text-sm text-red-600">
          <p>{error}</p>
          {onSkipFeedback && <button type="button" onClick={onSkipFeedback} className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">ข้ามการตรวจและทำต่อ</button>}
        </div>}
        {/* Figma 172:12716 — กล่องคำตอบ AI: bg #FFFEFA ขอบ 1.6px #E9CD62 r15 px20 py16
            ไอคอน 23px #C8E6FF + spark.svg (#006590) · หัวใจ 20px heart.svg (#E9CD62) */}
        {feedback && <div role="status" aria-live="polite" className="rounded-[15px] border-[1.6px] border-[#E9CD62] bg-[#FFFEFA] px-5 py-4">
          <div className="flex items-start gap-1">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <span className="grid size-[23px] shrink-0 place-items-center rounded-md bg-[#C8E6FF]">
                <Image src="/icon_svg/spark.svg" alt="" width={16} height={16} className="h-[15.8px] w-[15.8px]" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                {feedback.ai?.feedback && (
                  <p className="whitespace-pre-line break-words text-sm font-medium leading-[21px] text-[#76641C]">
                    {feedback.ai.feedback}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>}
      </section>
      )}
    </div>
  );
}
