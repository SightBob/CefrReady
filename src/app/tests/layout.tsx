import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Full Tests | CEFR Ready',
  description: 'ทดสอบภาษาอังกฤษแบบเต็มรูปแบบพร้อมบันทึกผลและติดตามความก้าวหน้า',
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
