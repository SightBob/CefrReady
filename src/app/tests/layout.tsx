import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Full Tests | CEFR Ready',
  description: 'ทดสอบภาษาอังกฤษแบบเต็มรูปแบบพร้อมบันทึกผลและติดตามความก้าวหน้า',
  alternates: { canonical: 'https://cefr-ready.vercel.app/tests' },
  openGraph: {
    title: 'Full Tests | CEFR Ready',
    description: 'ทดสอบภาษาอังกฤษแบบเต็มรูปแบบพร้อมบันทึกผลและติดตามความก้าวหน้า',
    url: 'https://cefr-ready.vercel.app/tests',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full Tests | CEFR Ready',
    description: 'ทดสอบภาษาอังกฤษแบบเต็มรูปแบบพร้อมบันทึกผลและติดตามความก้าวหน้า',
  },
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
