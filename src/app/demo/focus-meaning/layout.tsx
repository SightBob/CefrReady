import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Focus on Meaning — CEFR Ready',
  description: 'ลองทำข้อสอบคำศัพท์ภาษาอังกฤษ Focus on Meaning ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2',
  alternates: { canonical: 'https://cefr-ready.vercel.app/demo/focus-meaning' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
