import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Form & Meaning — CEFR Ready',
  description: 'ลองทำข้อสอบเติมคำในบทความ Form & Meaning ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2',
  alternates: { canonical: 'https://cefr-ready.site/demo/form-meaning' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
