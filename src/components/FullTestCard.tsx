'use client';

import Link from 'next/link';
import { Trophy, Clock, ListChecks, Lock } from 'lucide-react';

export default function FullTestCard({ disabled }: { disabled?: boolean } = {}) {
  if (disabled) {
    return (
      <div className="group block w-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-6 text-white shadow-lg mb-8 opacity-60 cursor-not-allowed select-none relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">Full Mock Exam</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">สอบจำลองเต็มรูปแบบ</h2>
            <p className="text-white/90 text-sm max-w-xl">
              45 ข้อรวมทุกพาร์ท พร้อมระบบ Adaptive ปรับระดับยากง่ายตามคำตอบของคุณ
            </p>
          </div>
          <div className="hidden sm:flex flex-col gap-2 text-sm text-white/90">
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 60 นาที</div>
            <div className="flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> 45 ข้อ</div>
          </div>
        </div>
        <div className="absolute inset-0 bg-slate-900/30 rounded-2xl flex items-center justify-center">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-slate-600">
            <Lock className="w-5 h-5" />
            <span className="font-medium">Login Required</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/tests/full"
      className="group block w-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 mb-8"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">Full Mock Exam</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">สอบจำลองเต็มรูปแบบ</h2>
          <p className="text-white/90 text-sm max-w-xl">
            45 ข้อรวมทุกพาร์ท พร้อมระบบ Adaptive ปรับระดับยากง่ายตามคำตอบของคุณ
          </p>
        </div>
        <div className="hidden sm:flex flex-col gap-2 text-sm text-white/90">
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 60 นาที</div>
          <div className="flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> 45 ข้อ</div>
        </div>
      </div>
    </Link>
  );
}
