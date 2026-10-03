'use client';

import { useState } from 'react';
import { CheckCircle2, Gem, Lightbulb, Pencil, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import type { TapExerciseItem } from '@/lib/test-set-slots';

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
}) {
  const [note, setNote] = useState('');
  const correctAnswer = item.correct === 0 ? 'A' : item.correct === 1 ? 'B' : null;
  const answered = selectedAnswer !== null;
  const isCorrect = correctAnswer !== null && selectedAnswer === correctAnswer;

  return (
    <div className="space-y-7 bg-white px-[43px] py-[33px] rounded-[20px]">
      {hint?.trim() && (
        <section className="flex gap-3 rounded-[15px] border-[1.6px] border-[#E9CD62] bg-[#FFFEFA] px-4 py-4 sm:px-5">
          <span className="grid size-[23px] shrink-0 place-items-center rounded-md bg-[#C8E6FF] text-[#006590]">
            <Sparkles size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold leading-5 text-[#6C5F2D]">คำแนะนำสำหรับข้อนี้</p>
            <p className="whitespace-pre-line text-sm font-medium leading-[21px] text-[#76641C]">{hint}</p>
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-base font-medium leading-8 text-[#1E293B]">{title || 'เลือกคำตอบที่ถูกต้อง'}</h2>
          {item.prompt.trim() && (
            <p className="text-base font-medium leading-[26px] text-[#1E293B]">{itemIndex + 1}. {item.prompt}</p>
          )}
        </div>

        <div className="space-y-[19px]">
          {(['A', 'B'] as const).map((key, index) => {
            const value = index === 0 ? item.choiceA : item.choiceB;
            const isSelected = selectedAnswer === key;
            const isAnswer = key === correctAnswer;
            const verifiedAnswer = answerIsCorrect ?? (revealAnswer ? isCorrect : null);
            const stateClass = !answered
              ? 'border-[#E2E8F0] bg-white'
              : revealAnswer
                ? isAnswer
                  ? 'border-[#D3D3D3] bg-[#ECFDF5]'
                  : isSelected
                    ? 'border-[#D3D3D3] bg-[#EEEEEE]'
                    : 'border-transparent bg-[#F8F8F8] opacity-70'
                : isSelected && verifiedAnswer !== null
                  ? `border-[#D3D3D3] ${verifiedAnswer ? 'bg-[#ECFDF5]' : 'bg-[#EEEEEE]'}`
                  : isSelected
                    ? 'border-[#D3D3D3] bg-[#EEEEEE]'
                    : 'border-transparent bg-[#F8F8F8] opacity-70';

            return (
              <button
                key={key}
                type="button"
                disabled={answered || disabled}
                onClick={() => onAnswer(key)}
                className={`flex min-h-[4.75rem] w-full items-center gap-3 rounded-[14px] border-[1.6px] px-4 py-4 text-left transition-colors sm:px-6 ${stateClass}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F1F5F9] text-sm font-bold text-[#64748B]">{key}</span>
                <span className="min-w-0 flex-1 text-base font-medium leading-[26px] text-[#1E293B]">{value}</span>
                {answered && ((revealAnswer && correctAnswer && isAnswer) || (isSelected && verifiedAnswer === true)) && <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />}
                {answered && isSelected && verifiedAnswer === false && <XCircle className="size-5 shrink-0 text-slate-500" />}
              </button>
            );
          })}
        </div>

      </section>

      {/* แสดงหลังเลือกคำตอบแล้วเท่านั้น */}
      {answered && (
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3.5">
          <h3 className="text-base font-medium leading-8 text-[#1E293B]">เหตุผลที่เลือกข้อนี้</h3>
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#ECF6FF] px-3 py-1.5 text-xs font-medium leading-5 text-[#46515F]">
            <Lightbulb size={14} className="shrink-0 text-[#6D88EE]" aria-hidden="true" />
            <span>หากยังไม่แน่ใจคำตอบ ลองเปิด <strong className='text-[#6D88EE]'>“โหมดทบทวน”</strong> เพื่อให้คุณ <strong className='text-[#6D88EE]'>“ทำโจทย์จริงได้”</strong> แบบเข้าใจมากขึ้น</span>
          </div>
        </div>
        <label className="flex min-h-[3.9375rem] w-full items-center gap-3 rounded-xl border-[1.6px] border-[#E2E8F0] bg-white px-4 py-3 sm:px-6">
          <Pencil size={16} className="shrink-0 text-[#9A9A9A]" aria-hidden="true" />
          <input
            type="text"
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="เขียนอธิบายสั้นๆ เพื่อรับ + 50 คะแนน"
            aria-label="เหตุผลที่เลือกข้อนี้"
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-700 placeholder:text-[#9A9A9A] focus:outline-none"
          />
          <span className="inline-flex h-[25px] shrink-0 items-center gap-1.5 rounded-lg bg-[#D6F7FF] px-3 text-xs font-bold text-[#00608A]">
            <Gem size={12} aria-hidden="true" /> + 50
          </span>
        </label>
        <p className="flex items-center gap-1.5 text-xs text-slate-400"><RotateCcw size={12} /> โน้ตนี้ใช้ฝึกทบทวนเท่านั้น ยังไม่บันทึกคะแนน</p>
      </section>
      )}
    </div>
  );
}
