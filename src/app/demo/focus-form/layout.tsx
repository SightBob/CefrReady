import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Focus on Form — CEFR Ready',
  description: 'ลองทำข้อสอบไวยากรณ์ภาษาอังกฤษ Focus on Form ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2',
  alternates: { canonical: 'https://cefr-ready.vercel.app/demo/focus-form' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
