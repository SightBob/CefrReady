import type { Metadata } from 'next';
import Link from 'next/link';
import TestsLandingShell from '@/components/TestsLandingShell';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ CEFR ฟรี',
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
 * หน้า /demo เหลือทางเข้าเดียว: ชุดตัวอย่างแบบผสมทุกทักษะ (/demo/intro → /demo/exam)
 * หน้า demo รายพาร์ทเดิมถูกลบแล้ว — URL เก่าถูก redirect ไป /demo/intro (next.config.mjs)
 */
export default function DemoTestsPage() {
  return (
    <TestsLandingShell
      hero={{
        title: 'ทดลองทำข้อสอบฟรี “ ไม่ต้องสมัครสมาชิก ”',
        subtitle: (
          <>
            ลองทำข้อสอบตัวอย่างจริง ชุดสั้น ๆ
            <br className="lg:hidden" />
            ครบทุกทักษะ ตั้งแต่ระดับ A1 ถึง C2
          </>
        ),
        cta: { href: '/demo/intro', labelMobile: 'เริ่มทดลองเลย', labelDesktop: 'ทดลองทำข้อสอบ' },
      }}
      sectionTitle="ทดลองทำข้อสอบตัวอย่าง"
    >
      <div className="mt-6 rounded-[14px] bg-[#F2F8FC] px-4 py-3 text-[13px] font-medium leading-[20px] text-[#53657F] lg:mt-8 lg:px-5">
        <p>🎉 These are short sample tests.</p>
        <p>
          For full tests with 20-30 questions and progress tracking,{' '}
          <Link href="/tests" className="font-semibold text-[#2A4246] underline underline-offset-2">
            login here
          </Link>
          .
        </p>
      </div>
    </TestsLandingShell>
  );
}
