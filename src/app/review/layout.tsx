import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Review | CEFR Ready',
  description: 'ดูผลการทดสอบและทบทวนคำตอบแต่ละข้อพร้อมคำอธิบาย',
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
