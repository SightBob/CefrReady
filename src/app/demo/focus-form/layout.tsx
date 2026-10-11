import type { Metadata } from 'next';

const DESCRIPTION =
  'ลองทำข้อสอบไวยากรณ์ภาษาอังกฤษ Focus on Form ตัวอย่างฟรี ไม่ต้องสมัครสมาชิก ระดับ A1-C2';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ Focus on Form',
  description: DESCRIPTION,
  alternates: { canonical: 'https://cefr-ready.site/demo/focus-form' },
  openGraph: {
    title: 'ทดลองทำข้อสอบ Focus on Form | CEFR Ready',
    description: DESCRIPTION,
    url: 'https://cefr-ready.site/demo/focus-form',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
