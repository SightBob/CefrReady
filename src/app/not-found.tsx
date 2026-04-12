import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 — ไม่พบหน้านี้ | CEFR Ready',
  description: 'ไม่พบหน้าที่คุณต้องการ กรุณากลับสู่หน้าหลัก',
};

export default function NotFound() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-16 left-1/4 w-72 h-72 bg-primary-100 rounded-full blur-3xl opacity-40 -z-10" />
      <div className="absolute bottom-16 right-1/4 w-96 h-96 bg-accent-100 rounded-full blur-3xl opacity-30 -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-50 rounded-full blur-3xl opacity-60 -z-10" />

      <div className="text-center max-w-lg">
        {/* Number with floating icon */}
        <div className="relative mb-10 select-none">
          <p className="text-[11rem] font-black leading-none bg-gradient-to-br from-slate-200 to-slate-100 bg-clip-text text-transparent">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white shadow-2xl rounded-3xl p-5 border border-slate-100 rotate-3 hover:rotate-0 transition-transform duration-300">
              <BookOpen className="w-14 h-14 text-primary-500" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">ไม่พบหน้าที่ต้องการ</h1>
        <p className="text-slate-500 mb-10 leading-relaxed text-lg">
          ดูเหมือนคุณหลงทางแล้ว ไม่ต้องกังวล —<br />
          มาเริ่มฝึก CEFR ด้วยกันดีกว่า!
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
          <Link href="/tests" className="btn-secondary inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            เริ่มทำข้อสอบ
          </Link>
        </div>
      </div>
    </div>
  );
}
