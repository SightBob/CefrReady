import type { Metadata } from 'next';

/**
 * หน้าสอบเต็มรูปแบบเป็น client component — layout นี้ตั้งชื่อแท็บให้ตรงกับพาร์ท
 * และกันไม่ให้หน้าทำข้อสอบถูกจัดอินเด็กซ์ (ก่อนหน้านี้สืบทอด metadata ของ /tests)
 */
export const metadata: Metadata = {
  title: 'สอบจำลองเต็มรูปแบบ (กำลังสอบ)',
  robots: { index: false, follow: true },
};

export default function FullExamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
