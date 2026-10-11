import type { Metadata } from 'next';

const DESCRIPTION =
  'ลองทำข้อสอบเติมคำในบทความ Form & Meaning ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Form & Meaning',
  description: DESCRIPTION,
  alternates: { canonical: 'https://cefr-ready.site/demo/form-meaning' },
  openGraph: {
    title: 'ทดลองทำข้อสอบ Form & Meaning | CEFR Ready',
    description: DESCRIPTION,
    url: 'https://cefr-ready.site/demo/form-meaning',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
