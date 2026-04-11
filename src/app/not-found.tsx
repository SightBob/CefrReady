import Link from 'next/link';
import type { Metadata } from 'next';
import { Search, Home, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 — ไม่พบหน้านี้ | CEFR Ready',
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-black text-slate-200 select-none mb-4">404</p>
        <div className="inline-flex bg-primary-50 p-4 rounded-2xl mb-6">
          <Search className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">ไม่พบหน้าที่ต้องการ</h1>
        <p className="text-slate-500 mb-8">
          หน้านี้อาจถูกย้ายหรือลบออกไปแล้ว กรุณาตรวจสอบ URL อีกครั้ง
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
          <Link href="/must-know" className="btn-secondary inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Must Know
          </Link>
        </div>
      </div>
    </div>
  );
}
