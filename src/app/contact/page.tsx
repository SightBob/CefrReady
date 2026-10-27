'use client';

// ต้องคง 'use client' ไว้: @phosphor-icons/react เรียก createContext ตอน import
// ถ้าถูกดึงเข้า server component จะพังตอน build (createContext is not a function)
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FacebookLogo, InstagramLogo } from '@phosphor-icons/react';

/**
 * หน้าติดต่อเรา — ใช้ชุดธีมเดียวกับ redesign ตาม Figma
 * (ครีม #FFFEFA · ขาว + ขอบ #EAEAEA + เงาแข็ง #D5D3D3 · น้ำเงินแบรนด์ #5A95C6 · เหลือง #FFF0AE/#FFDB40)
 *
 * เหลือเฉพาะช่องทางโซเชียล — ฟอร์ม "แจ้งปัญหาและข้อเสนอแนะ" ถูกเอาออกแล้ว
 */
export default function ContactPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA]">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#808080] transition-colors hover:text-[#5A95C6]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับหน้าหลัก
        </Link>

        <h1 className="mb-3 text-4xl font-bold leading-none tracking-tighter text-[#556376] md:text-5xl">
          ติดต่อเรา
        </h1>
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-[#808080]">
          พูดคุยกับทีมงานผ่านช่องทางโซเชียลได้เลย
        </p>

        <section aria-label="ช่องทางติดต่อ" className="grid gap-4 sm:grid-cols-2">
          <a
            href="https://www.facebook.com/profile.php?id=61590152890102"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-44 flex-col rounded-[14px] border border-[#EAEAEA] bg-white p-6 shadow-[3px_4px_0px_#D5D3D3] transition-all hover:-translate-y-0.5 hover:shadow-[4px_6px_0px_#D5D3D3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A95C6]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#5A95C6]/10">
              <FacebookLogo className="h-6 w-6 text-[#5A95C6]" aria-hidden="true" weight="fill" />
            </span>
            <span className="mt-4 text-base font-bold text-[#3E3E3E]">Facebook</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-[#808080]">
              ทักแชตสอบถามข้อมูล สมัครเรียน หรือแจ้งปัญหาได้เร็วที่สุด
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#5A95C6]">
              เปิด Facebook
              <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </a>
          <a
            href="https://www.instagram.com/cefr_ready/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-44 flex-col rounded-[14px] border border-[#EAEAEA] bg-white p-6 shadow-[3px_4px_0px_#D5D3D3] transition-all hover:-translate-y-0.5 hover:shadow-[4px_6px_0px_#D5D3D3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A95C6]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#5A95C6]/10">
              <InstagramLogo className="h-6 w-6 text-[#5A95C6]" aria-hidden="true" weight="fill" />
            </span>
            <span className="mt-4 text-base font-bold text-[#3E3E3E]">Instagram</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-[#808080]">
              ติดตามเทคนิคการสอบ เคล็ดลับ และข่าวสารจาก CEFR Ready
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#5A95C6]">
              เปิด Instagram
              <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </a>
        </section>
      </main>
    </div>
  );
}
