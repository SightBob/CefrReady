import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Coffee, Heart, ShieldCheck } from 'lucide-react';
import DownloadQRButton from './DownloadQRButton';

export const metadata = {
  title: 'เลี้ยงค่ากาแฟ | CEFR Ready',
  description: 'สนับสนุน CEFR Ready ผ่าน QR code แบบ static',
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#FAFAFA]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#111] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        <section className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-start">
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 mb-5">
              <Coffee className="w-4 h-4" />
              เลี้ยงค่ากาแฟ
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#111] leading-tight">
              สนับสนุน CEFR Ready
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-2xl">
              CEFR Ready เป็นโปรเจกต์ฟรีที่พัฒนาต่อเนื่อง การสนับสนุนจากคุณช่วยให้เราดูแลข้อสอบ บทความ และระบบให้คงอยู่และดีขึ้นต่อไป
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-2xl">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Heart className="w-5 h-5 text-rose-500 mb-3" />
                <p className="font-bold text-[#111]">สมัครใจ ไม่ผูกมัด</p>
                <p className="text-sm text-slate-500 mt-1">สนับสนุนตามใจ ไม่กระทบสิทธิ์การใช้งานใดๆ</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mb-3" />
                <p className="font-bold text-[#111]">สแกน QR เพื่อสนับสนุน</p>
                <p className="text-sm text-slate-500 mt-1">ไม่ต้องลงทะเบียน ไม่ผ่านระบบชำระเงินภายนอก</p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Image
                src="/coffee-qr.jpg"
                alt="QR code สำหรับเลี้ยงค่ากาแฟ CEFR Ready"
                width={640}
                height={640}
                priority
                className="w-full rounded-xl bg-white"
              />
            </div>
            <div className="mt-4 text-center">
              <p className="font-bold text-[#111]">สแกนเพื่อสนับสนุน</p>
              <p className="text-sm text-slate-500 mt-1">ขอบคุณที่ช่วยให้ CEFR Ready ไปต่อได้</p>
            </div>
            <DownloadQRButton />
          </aside>
        </section>
      </div>
    </main>
  );
}
