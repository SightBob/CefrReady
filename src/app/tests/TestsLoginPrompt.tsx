'use client';

import { LogIn, Lock } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { absoluteCallbackUrl } from '@/lib/redirect-safety';

export default function TestsLoginPrompt() {
  return (
    <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 mb-8 text-white">
      <div className="flex items-center gap-3 mb-3">
        <Lock className="w-6 h-6" />
        <h2 className="text-xl font-bold">ต้องเข้าสู่ระบบ</h2>
      </div>
      <p className="text-white/90 mb-4">
        เข้าสู่ระบบเพื่อทำข้อสอบเต็มรูปแบบ 20–30 ข้อ บันทึกความคืบหน้า และติดตามพัฒนาการของคุณรายหมวด
      </p>
      <button
        onClick={() =>
          Promise.resolve(
            signIn('google', {
              // กลับมาหน้าที่ผู้เรียนตั้งใจเข้า (เช่น /progress) ไม่ใช่ /tests ตายตัว
              callbackUrl: absoluteCallbackUrl(window.location.pathname, window.location.origin),
            }),
          ).catch(() => {})
        }
        className="bg-white text-primary-600 px-6 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center gap-2"
      >
        <LogIn className="w-5 h-5" />
        เข้าสู่ระบบ
      </button>
    </div>
  );
}
