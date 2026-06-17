'use client';

import Link from 'next/link';
import { Star, Target, ChartBar } from '@phosphor-icons/react';

interface CategoryData {
  testTypeId: string;
  averageScore: number;
  testsTaken: number;
}

const BASE_SKILLS: Record<string, { label: string; sectionHref: string }> = {
  'focus-form':    { label: 'Focus Form',    sectionHref: '/tests/focus-form' },
  'focus-meaning': { label: 'Focus Meaning', sectionHref: '/tests/focus-meaning' },
  'form-meaning':  { label: 'Form Meaning',  sectionHref: '/tests/form-meaning' },
  'listening':     { label: 'Listening',     sectionHref: '/tests/listening' },
  'full-test':     { label: 'Full Mock Exam', sectionHref: '/tests/full' },
};

const SKILL_TIPS: Record<string, string> = {
  'focus-form': 'ไวยากรณ์คือรากฐาน ลองทบทวนบทความ Grammar Must-Know แล้วทำชุดนี้ซ้ำครับ',
  'focus-meaning': 'สะสมคำศัพท์และฝึกตีความประโยค ด้วยการอ่านบทความ CEFR ทุกวันครับ',
  'form-meaning': 'โจทย์ผสมต้องการทั้งไวยากรณ์และความหมาย ลองทำ Focus Form กับ Focus Meaning ก่อนครับ',
  'listening': 'ฝึกฟังบ่อยๆ ในบริบทธรรมชาติ เช่น Podcast ภาษาอังกฤษ 10 นาทีต่อวันครับ',
  'full-test': 'ทำ Full Mock Exam อย่างสม่ำเสมอเพื่อวัดระดับรวมทุกทักษะ และดูจุดที่ต้องปรับปรุงครับ',
};

export default function SmartInsights({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-4 bg-[#F9F9F8] rounded-2xl border border-[#EAEAEA]">
        <div className="w-12 h-12 bg-white rounded-xl border border-[#EAEAEA] flex items-center justify-center">
          <ChartBar size={24} weight="duotone" className="text-[#AAA]" />
        </div>
        <div>
          <p className="font-semibold text-[#111] mb-1">ยังไม่มีข้อมูลเพียงพอ</p>
          <p className="text-sm text-[#787774]">ทำข้อสอบอย่างน้อย 1 ครั้งเพื่อดู Smart Insights ของคุณ</p>
        </div>
        <Link href="/tests" className="text-xs font-semibold border border-[#111] text-[#111] rounded-full px-4 py-1.5 hover:bg-[#111] hover:text-white transition-colors">
          เริ่มทำข้อสอบ →
        </Link>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.averageScore - b.averageScore);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  const weakestHref = BASE_SKILLS[weakest.testTypeId]?.sectionHref || '/tests';
  const strongestLabel = BASE_SKILLS[strongest.testTypeId]?.label || strongest.testTypeId;
  const weakestLabel = BASE_SKILLS[weakest.testTypeId]?.label || weakest.testTypeId;
  const tip = SKILL_TIPS[weakest.testTypeId] || 'ฝึกฝนอย่างสม่ำเสมอในจุดที่ยังพลาดอยู่ เพื่ออัปเลเวลให้เร็วยิ่งขึ้นครับ';

  const getBar = (score: number) => {
    if (score >= 70) return 'bg-emerald-400';
    if (score >= 50) return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {sorted.slice().reverse().map(cat => {
          const label = BASE_SKILLS[cat.testTypeId]?.label ?? cat.testTypeId;
          return (
            <div key={cat.testTypeId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#333]">{label}</span>
                <span className="font-bold text-[#111]">{cat.averageScore.toFixed(2)}%</span>
              </div>
              <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBar(cat.averageScore)} rounded-full transition-all duration-700`}
                  style={{ width: `${cat.averageScore}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl border border-[#EAEAEA] bg-[#F7F6F3] mt-1">
        <div className="flex gap-3">
          <Star size={22} weight="fill" className="text-[#111] shrink-0" />
          <div>
            <p className="font-bold text-[#111] text-xs uppercase tracking-widest mb-0.5">จุดแข็ง</p>
            <p className="font-semibold text-[#111] text-base leading-snug">{strongestLabel}</p>
            <p className="text-xs text-[#787774] mt-0.5">คะแนนเฉลี่ย {strongest.averageScore.toFixed(2)}% — ยอดเยี่ยมมาก</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-[#EAEAEA] bg-white">
        <div className="flex gap-3">
          <Target size={22} weight="duotone" className="text-[#111] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#111] text-xs uppercase tracking-widest mb-0.5">ควรพัฒนา</p>
            <p className="font-semibold text-[#111] text-base leading-snug">{weakestLabel}</p>
            <p className="text-xs text-[#787774] mt-0.5 mb-3">{tip}</p>
            <Link
              href={weakestHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#111] text-white rounded-full px-3.5 py-1.5 hover:bg-[#333] transition-colors"
            >
              ฝึกทักษะนี้เลย →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}