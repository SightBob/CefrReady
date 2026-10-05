import type { Metadata } from 'next';
import DemoTestsSection, { DemoInfoNote } from '@/components/DemoTestsSection';
import TestsLandingShell from '@/components/TestsLandingShell';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ CEFR ฟรี — Demo Tests',
  description: 'ลองทำข้อสอบ CEFR ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ครอบคลุม Focus on Form, Meaning, Listening ระดับ A1-C2',
  alternates: { canonical: 'https://cefr-ready.site/demo' },
  openGraph: {
    title: 'ทดลองทำข้อสอบ CEFR ฟรี | CEFR Ready',
    description: 'ลองทำข้อสอบ CEFR ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ครอบคลุม Focus on Form, Meaning, Listening ระดับ A1-C2',
    url: 'https://cefr-ready.site/demo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ทดลองทำข้อสอบ CEFR ฟรี | CEFR Ready',
    description: 'ลองทำข้อสอบ CEFR ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ครอบคลุม Focus on Form, Meaning, Listening ระดับ A1-C2',
  },
};

/**
 * หน้า /demo ใช้โครงหน้าเดียวกับ /tests (ประกาศ + hero + เส้นคลื่น + หัวข้อหมวดหมู่)
 * แต่ flow เดิมของ demo ไว้ครบ: ไม่ต้อง login, ลิงก์ไป 4 หน้าเดิม, 5 ข้อต่อชุด
 */
export default function DemoTestsPage() {
  return (
    <TestsLandingShell
      hero={{
        title: 'ทดลองทำข้อสอบฟรี “ ไม่ต้องสมัครสมาชิก ”',
        subtitle: (
          <>
            ลองทำข้อสอบตัวอย่างจริง ชุดละ 5 ข้อ
            <br className="lg:hidden" />
            ครบทุกทักษะ ตั้งแต่ระดับ A1 ถึง C2
          </>
        ),
        cta: { href: '/demo/focus-form', labelMobile: 'เริ่มทดลองเลย', labelDesktop: 'ทดลองทำข้อสอบ' },
      }}
      sectionTitle="เลือกทดลองตามทักษะ"
    >
      {/* 200:9242 — การ์ดแรกขยับลง 8px ระยะห่างการ์ด 14px (ค่าเดียวกับหน้า /tests) */}
      <div className="mt-[4px] grid grid-cols-1 gap-[14px] py-2 sm:grid-cols-2 lg:mt-[14px] lg:grid-cols-4 lg:gap-5 lg:py-0">
        <DemoTestsSection />
      </div>

      <DemoInfoNote />
    </TestsLandingShell>
  );
}
