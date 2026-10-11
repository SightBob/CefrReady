import type { Metadata } from 'next';

const DESCRIPTION =
  'ลองทำข้อสอบคำศัพท์ภาษาอังกฤษ Focus on Meaning ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Focus on Meaning',
  description: DESCRIPTION,
  alternates: { canonical: 'https://cefr-ready.site/demo/focus-meaning' },
  openGraph: {
    title: 'ทดลองทำข้อสอบ Focus on Meaning | CEFR Ready',
    description: DESCRIPTION,
    url: 'https://cefr-ready.site/demo/focus-meaning',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
