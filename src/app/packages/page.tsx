import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'แพ็กเกจ — CEFR Ready',
  description: 'แพ็กเกจและแผนการใช้งาน CEFR Ready — เร็วๆ นี้',
  openGraph: {
    title: 'แพ็กเกจ — CEFR Ready',
    description: 'แพ็กเกจและแผนการใช้งาน CEFR Ready — เร็วๆ นี้',
  },
};

export default function PackagesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
      <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary-600 mb-4">
        กำลังเตรียมตัว
      </span>
      <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
        แพ็กเกจ
      </h1>
      <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto mb-10">
        เรากำลังเตรียมแพ็กเกจพิเศษเพื่อให้คุณฝึกข้อสอบ CEFR ได้ครบทุกระดับ
        โปรดติดตามการอัปเดตในเร็วๆ นี้
      </p>
      <Link
        href="/tests"
        className="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-3 md:px-8 md:py-4"
      >
        เริ่มทำข้อสอบฟรี
        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
      </Link>
    </div>
  );
}
