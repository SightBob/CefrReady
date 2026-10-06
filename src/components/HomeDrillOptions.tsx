'use client';

import { useState } from 'react';

const DRILL_OPTIONS = ["hasn't finished", "didn't finish", "doesn't finish"];
const CORRECT = 0;

export default function HomeDrillOptions() {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="mt-7 max-md:mt-[16px] flex flex-wrap max-md:grid max-md:grid-cols-3 max-[414px]:grid-cols-1 max-md:gap-[9px] gap-[18px]">
      {/* ≤414px ซ้อนเป็น 1 คอลัมน์ (ปุ่มกว้างเต็ม) เพราะตัวเลือกจริงยาวกว่าใน mock และยก touch target เป็น 44px */}
      {DRILL_OPTIONS.map((opt, i) => {
        const isPicked = picked === i;
        const isCorrect = i === CORRECT;
        const showState = picked !== null;
        return (
          <button
            key={opt}
            onClick={() => setPicked(i)}
            className={`flex h-[52px] max-md:h-auto max-md:min-h-[41px] max-[414px]:min-h-[44px] max-md:py-[5px] min-w-[176px] max-md:min-w-0 flex-1 max-md:flex-none items-center gap-[12px] max-md:gap-[8px] rounded-[9px] border-[1.6px] max-md:border-[1.2px] px-[16px] max-md:px-[5px] text-left transition-colors ${
              showState && isCorrect
                ? 'border-[#8FC16A] bg-[#F0F9E8]'
                : showState && isPicked && !isCorrect
                  ? 'border-[#E8A0A0] bg-[#FDF0F0]'
                  : 'border-[#E2E8F0] bg-white hover:border-[#8FC16A]'
            }`}
          >
            <span className="flex size-[28px] max-md:size-[24px] shrink-0 items-center justify-center rounded-[8px] max-md:rounded-[6px] bg-[#F1F5F9] text-[14px] max-md:text-[12px] font-bold text-[#64748B]">
              A
            </span>
            <span className="min-w-0 text-[16px] max-md:text-[12px] font-medium text-[#1E293B]">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
