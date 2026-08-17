'use client';

import Link from 'next/link';
import { Clock, ListChecks, Lock } from 'lucide-react';

export default function FullTestCard({ disabled }: { disabled?: boolean } = {}) {
  if (disabled) {
    return (
      <div className="group block w-full bg-white rounded-2xl px-5 sm:px-6 py-5 sm:py-6 mt-6 mb-2 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-4">
          <div>
            <h2 className="text-[17px] sm:text-[1.1875rem] text-[#454578] font-bold mb-2.5 sm:mb-2 leading-snug">
              จำลองการสอบจริง - เต็มรูปแบบ
            </h2>

            <div className="flex gap-2 text-sm text-[#6160A8]">
              <div className="flex items-center gap-1.5 bg-[#F1F1FA] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-full sm:rounded-none">
                <Clock className="w-4 h-4" /> 60 นาที
              </div>
              <div className="flex items-center gap-1.5 bg-[#F1F1FA] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-full sm:rounded-none">
                <ListChecks className="w-4 h-4" /> 45 ข้อ
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto bg-[#E8E8EF] px-[40px] py-3 sm:py-[15px] text-center rounded-full text-[16px] sm:text-[18px] font-semibold text-[#9C9CB5] cursor-not-allowed flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            เข้าสอบเมื่อ Login
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="group block w-full bg-white rounded-2xl px-5 sm:px-6 py-5 sm:py-6 mt-6 mb-2">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-4">
    <div>
      <h2 className="text-[17px] sm:text-[1.1875rem] text-[#454578] font-bold mb-2.5 sm:mb-2 leading-snug">
        จำลองการสอบจริง - เต็มรูปแบบ
      </h2>

      <div className="flex gap-2 text-sm text-[#6160A8]">
        <div className="flex items-center gap-1.5 bg-[#F1F1FA] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-full sm:rounded-none">
          <Clock className="w-4 h-4" /> 60 นาที
        </div>
        <div className="flex items-center gap-1.5 bg-[#F1F1FA] sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-full sm:rounded-none">
          <ListChecks className="w-4 h-4" /> 45 ข้อ
        </div>
      </div>
    </div>

    <Link 
      href="/tests/full" 
      className="w-full sm:w-auto bg-[#6D88EE] active:bg-[#5A75D9] px-[40px] py-3 sm:py-[15px] text-center rounded-full text-[16px] sm:text-[18px] font-semibold text-white transition-colors"
    >
      เข้าห้องสอบ
    </Link>
  </div>
</div>
  );
}
