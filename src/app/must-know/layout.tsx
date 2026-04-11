import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Must Know — ข้อมูลสำคัญก่อนสอบ | CEFR Ready',
  description: 'รวมไวยากรณ์และคำศัพท์ภาษาอังกฤษที่ต้องรู้ก่อนสอบ CEFR แบ่งตามระดับ A1-C2',
};

export default function MustKnowLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
