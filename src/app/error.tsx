'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-16 right-1/4 w-80 h-80 bg-red-50 rounded-full blur-3xl opacity-70 -z-10" />
      <div className="absolute bottom-16 left-1/4 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 -z-10" />

      <div className="text-center max-w-lg">
        {/* Error visual */}
        <div className="relative mb-10 select-none">
          <p className="text-[9rem] font-black leading-none bg-gradient-to-br from-red-100 to-orange-100 bg-clip-text text-transparent">
            Oops!
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white shadow-2xl rounded-3xl p-5 border border-red-100 -rotate-3 hover:rotate-0 transition-transform duration-300">
              <AlertTriangle className="w-14 h-14 text-red-500" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-4">เกิดข้อผิดพลาด</h2>
        <p className="text-slate-500 mb-4 leading-relaxed text-lg">
          เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
        </p>

        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-8 inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={reset} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
          <Link href="/" className="btn-secondary inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
