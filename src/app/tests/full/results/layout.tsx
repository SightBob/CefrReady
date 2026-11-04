import type { Metadata } from 'next';

/**
 * หน้าผลสอบ Full Test เป็น client component — ถ้าไม่ประกาศ metadata เองจะสืบทอด
 * default ของ /tests ("ข้อสอบ CEFR | CEFR Ready") แล้วถูก root template ต่อท้ายอีกครั้ง
 * จนได้ title ซ้ำว่า "ข้อสอบ CEFR | CEFR Ready | CEFR Ready" (พบตอนทดสอบจริง)
 *
 * ผลสอบเป็นข้อมูลส่วนตัวของผู้เรียน → ไม่จัดอินเด็กซ์
 */
export const metadata: Metadata = {
  title: 'ผลการสอบ',
  robots: { index: false, follow: true },
};

export default function FullResultsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
