import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isSectionInMaintenance } from '@/lib/test-section-maintenance';

export const metadata: Metadata = {
  title: 'สอบจำลองเต็มรูปแบบ | CEFR Ready',
  description: 'ข้อสอบ CEFR 45 ข้อ ครบทุกพาร์ท ระบบ Adaptive ปรับระดับตามคำตอบ',
};

const CEFR_TABLE = [
  { level: 'C2', range: '101 – 120', desc: 'เชี่ยวชาญสูงสุด' },
  { level: 'C1', range: '81 – 100', desc: 'ขั้นสูง' },
  { level: 'B2', range: '61 – 80', desc: 'ขั้นกลางสูง' },
  { level: 'B1', range: '41 – 60', desc: 'ขั้นกลาง' },
  { level: 'A2', range: '21 – 40', desc: 'ขั้นต้น' },
  { level: 'A1', range: '1 – 20', desc: 'ขั้นพื้นฐาน' },
];

const RULES = [
  'ไม่สามารถย้อนกลับไปแก้ข้อก่อนหน้าได้',
  'หากไม่ตอบและกดข้อถัดไป ข้อนั้นจะถือว่าผิด',
  'เมื่อครบ 60 นาทีระบบจะส่งคำตอบโดยอัตโนมัติ',
  'สามารถกดยกเลิกการสอบได้ตลอดเวลา',
];

/**
 * หน้าแนะนำ Full Test — ใช้ design system เดียวกับหน้า intro ชุดข้อสอบ
 * (Figma 200:7663 mobile / 75:68795 desktop) ผ่าน CSS vars .intro-fluid:
 * การ์ดขาว rounded-[30px] + นากถือป้ายเหลือง + ปุ่มปิด + stat bubbles + CTA เหลือง
 * ส่วนตารางคะแนน CEFR ใช้ bg/เส้นปะจาก Figma node 249:3271 ส่วนกติกาเป็นการ์ดเสริมใต้การ์ดหลัก
 * (ใช้ token จากการ์ดเฉลยของ TestResults: heading #4a4a4a, แถวขาว rounded-[12px])
 */
export default async function FullTestIntroPage() {
  const session = await auth();

  // Admin ปิดปรับปรุง Full Test → หน้าแจ้งเฉพาะพาร์ท
  if (await isSectionInMaintenance('full')) redirect('/tests/full/maintenance');

  return (
    <div className="intro-fluid flex min-h-svh flex-col bg-[#F7F7F7]">
      {/* การ์ดหลัก — โครงเดียวกับหน้า intro ชุดข้อสอบ (การ์ดสูงอัตโนมัติตามเนื้อหา) */}
      <div className="relative mx-auto mt-[var(--intro-card-mt)] w-[var(--intro-card-w)] max-w-full shrink-0 rounded-[30px] bg-white">
        {/* ปุ่มปิด — mobile 200:7665 (35×30, ไอคอน 20px, เส้นขอบล่าง-ขวา) → desktop 75:68807 */}
        <Link
          href="/tests"
          aria-label="กลับไปหน้าข้อสอบ"
          className="absolute right-[var(--intro-close-right)] top-[var(--intro-close-top)] flex h-[var(--intro-close-h)] w-[var(--intro-close-w)] items-center justify-center rounded-[8px] border-b-[length:var(--intro-close-border)] border-r-[length:var(--intro-close-border)] border-[#C0BFB7] bg-white shadow-[0_0_0.3px_rgba(0,0,0,0.25)] md:border-l md:border-t"
        >
          <Image src="/tests/close-card.svg" alt="" width={20} height={20} unoptimized className="h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:hidden" aria-hidden="true" />
          <Image src="/icons/close.svg" alt="" width={24} height={24} className="hidden h-[var(--intro-close-icon)] w-[var(--intro-close-icon)] md:block" aria-hidden="true" />
        </Link>

        {/* นากพร้อมป้ายสอบ — mobile 200:7668/200:7669 → desktop 75:68797 */}
        <div aria-hidden="true" className="absolute left-1/2 top-[var(--intro-otter-top)] w-[var(--intro-otter-w)] -translate-x-1/2">
          <div className="absolute left-[var(--intro-sign-left)] top-[var(--intro-sign-top)] z-0 h-[var(--intro-sign-h)] w-[var(--intro-sign-w)] rounded-bl-[3px] rounded-br-[15px] border-r-[7px] border-[#FFDB40] bg-[#FFEDA0]" />
          <div className="relative z-10 h-[var(--intro-otter-inner-h)] w-[var(--intro-otter-w)] overflow-hidden md:overflow-visible">
            <Image
              src="/logo-otter/otter-exam.png"
              alt=""
              width={174}
              height={174}
              className="absolute left-0 top-0 h-[var(--intro-otter-w)] w-[var(--intro-otter-w)] max-w-none md:h-auto"
            />
          </div>
        </div>

        {/* หัวเรื่อง / คำอธิบาย / stat bubbles — ตำแหน่งตาม var เดียวกับหน้า intro ชุดข้อสอบ */}
        <div className="flex flex-col items-center px-4 pt-[var(--intro-text-top)] md:px-6 pb-5">
          <h1 className="max-w-full text-center text-[length:var(--intro-title-size)] font-bold leading-[var(--intro-title-lh)] text-[#334155]">
            สอบจำลองเต็มรูปแบบ
          </h1>
          <p className="mt-[var(--intro-desc-gap)] w-full max-w-[var(--intro-desc-width)] text-center text-[length:var(--intro-desc-size)] font-semibold leading-[var(--intro-desc-lh)] text-[#334155]">
            ทดสอบตัวเองด้วยข้อสอบ 45 ข้อที่รวมทุกพาร์ท ระบบปรับระดับความยากตามคำตอบของคุณแบบเรียลไทม์
          </p>
          <div className="mt-[var(--intro-stats-gap)] flex flex-col items-center gap-[11px] md:flex-row">
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                มีทั้งหมด 45 ข้อ
              </p>
            </div>
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                จับเวลา 60 นาที
              </p>
            </div>
            <div className="flex h-[52px] w-[193px] items-center justify-center rounded-[14px] bg-[#F8F6EF]">
              <p className="text-center text-[length:var(--intro-bubble-size)] font-semibold leading-[24px] text-[#6C5F2D]">
                ปรับระดับอัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* การ์ดเสริม: ช่วงคะแนน CEFR + กติกา — bg/เส้นปะตาม Figma node 249:3271 (bg #F2F2F2 + border 4px dashed #E2E8F0 + มุมบนโค้ง 30px) */}
        <div className="mx-auto mt-[15px] w-[var(--intro-card-w)] max-w-full shrink-0 space-y-[14px] px-0 pb-[20px]">
          <div className="rounded-tl-[30px] rounded-tr-[30px] border-4 border-dashed border-[#E2E8F0] bg-[#F2F2F2] px-4 pb-5 pt-[18px] md:px-6">
            <h2 className="text-center text-[18px] font-semibold leading-7 text-[#4a4a4a]">
              ช่วงคะแนนและระดับ CEFR
            </h2>
            <div className="mt-4 flex w-full flex-col gap-[10px]">
              {CEFR_TABLE.map((row) => (
                <div key={row.level} className="flex w-full items-center gap-4 rounded-[12px] bg-white px-[14px] py-[10px]">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#FFF0AE] text-[14px] font-bold text-[#6C5F2D]">
                    {row.level}
                  </span>
                  <p className="min-w-0 flex-1 text-[14px] font-semibold text-[#1e293b]">{row.desc}</p>
                  <span className="shrink-0 rounded-[8px] bg-[#F3F3F3] px-[10px] py-1 text-[12px] font-bold text-[#585E5F]">
                    {row.range}
                  </span>
                </div>
              ))}
            </div>
        </div>

        <div className="rounded-[30px] bg-white px-4 pb-6 pt-[18px] md:px-6">
          <h2 className="text-center text-[18px] font-semibold leading-7 text-[#4a4a4a]">กติกา</h2>
          <ul className="mt-3 w-full space-y-[8px]">
            {RULES.map((rule) => (
              <li key={rule} className="flex w-full items-start gap-[10px]">
                <span aria-hidden="true" className="mt-[7px] size-[6px] shrink-0 rounded-full bg-[#FFDB40]" />
                <p className="text-[13px] leading-[22px] text-[#475569]">{rule}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* แถบล่าง + ปุ่มเริ่มสอบ — โครงเดียวกับหน้า intro ชุดข้อสอบ (mobile 200:7727 / desktop 75:68810) */}
      <div className="mt-auto flex w-full shrink-0 justify-center bg-white shadow-[0_0_3.3px_rgba(172,172,172,0.25)]">
        <div className="flex w-full max-w-[1061px] items-center justify-center px-4 py-4 md:justify-end md:pr-[var(--intro-bar-pr)] xl:px-0">
          {session?.user ? (
            <Link
              href="/tests/full/exam"
              className="flex h-[var(--intro-cta-h)] w-full max-w-[var(--intro-cta-w)] items-center justify-center rounded-[14px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-center text-[length:var(--intro-cta-size)] font-semibold text-[#524924] xl:h-[49px] xl:w-[216px] xl:max-w-none xl:border xl:border-b-4 xl:border-r-[3px] xl:text-[16px]"
            >
              เริ่มสอบ
            </Link>
          ) : (
            <Link
              href="/api/auth/signin?callbackUrl=/tests/full"
              className="flex h-[var(--intro-cta-h)] w-full max-w-[var(--intro-cta-w)] items-center justify-center rounded-[14px] border-b-[3px] border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] text-center text-[length:var(--intro-cta-size)] font-semibold text-[#524924] xl:h-[49px] xl:w-[216px] xl:max-w-none xl:border xl:border-b-4 xl:border-r-[3px] xl:text-[16px]"
            >
              เข้าสู่ระบบเพื่อเริ่มสอบ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
