import type { Metadata } from 'next';
import { Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ปิดปรับปรุงชั่วคราว',
  description:
    'ระบบอยู่ระหว่างปิดปรับปรุงชั่วคราว ขออภัยในความไม่สะดวก แล้วพบกันใหม่เร็วๆ นี้',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
          <Wrench className="h-10 w-10 text-primary-500" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          ปิดปรับปรุงระบบชั่วคราว
        </h1>
        <p className="text-slate-600 leading-relaxed mb-2">
          เรากำลังอัปเกรดระบบเพื่อให้ใช้งานได้ดีขึ้นกว่าเดิม
        </p>
        <p className="text-slate-600 leading-relaxed mb-8">
          ขออภัยในความไม่สะดวก แล้วพบกันใหม่เร็วๆ นี้
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500"></span>
          </span>
          ระบบจะกลับมาให้ใช้งานอีกครั้งโดยเร็ว
        </div>
      </div>
    </main>
  );
}
