'use client';

import Link from 'next/link';
import { Trophy, Clock, ListChecks } from 'lucide-react';

export default function FullTestCard() {
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
