import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Listening — CEFR Ready',
  description: 'ลองทำข้อสอบฟังภาษาอังกฤษ Listening ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2',
  alternates: { canonical: 'https://cefr-ready.vercel.app/demo/listening' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
