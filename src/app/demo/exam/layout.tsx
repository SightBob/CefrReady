import type { Metadata } from 'next';

/**
 * หน้าทำข้อสอบโหมดตัวอย่างเป็น client component — layout นี้ตั้งชื่อแท็บเอง
 * และกันไม่ให้ถูกจัดอินเด็กซ์ พร้อมตัด canonical ที่สืบทอดมาจาก /demo ก่อนหน้านี้
 */
export const metadata: Metadata = {
  title: 'โหมดตัวอย่าง — กำลังทำข้อสอบ',
  robots: { index: false, follow: true },
};

export default function DemoExamLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
