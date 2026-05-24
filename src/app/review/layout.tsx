import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ดูเฉลยข้อสอบ | CEFR Ready',
  description: 'ทบทวนคำตอบแต่ละข้อพร้อมคำอธิบาย วิเคราะห์จุดแข็งและจุดที่ควรพัฒนา',
  openGraph: {
    title: 'ดูเฉลยข้อสอบ | CEFR Ready',
    description: 'ทบทวนคำตอบแต่ละข้อพร้อมคำอธิบาย วิเคราะห์จุดแข็งและจุดที่ควรพัฒนา',
  },
  robots: { index: false, follow: true },
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
