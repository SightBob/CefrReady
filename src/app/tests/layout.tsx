import type { Metadata } from 'next';

const TESTS_DESCRIPTION =
  'ฝึกทำข้อสอบ CEFR แต่ละทักษะ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 พร้อมเฉลยทุกข้อ';

/**
 * metadata ระดับ subtree ของ /tests — เป็นค่าตั้งต้นของหน้าลูกที่ไม่ได้ประกาศเอง
 * title ต้องเป็น "ชื่อหน้าเปล่า ๆ" เพราะ root layout เติม " | CEFR Ready" ให้แล้ว
 * (ดู src/app/layout.tsx → title.template) ส่วน openGraph/twitter ไม่ผ่าน template จึงใส่ชื่อเว็บเอง
 * ห้ามใส่ alternates ที่นี่ เพราะจะ cascade ไปทุกหน้าลูก
 */
export const metadata: Metadata = {
  title: 'ข้อสอบ CEFR',
  description: TESTS_DESCRIPTION,
  openGraph: {
    title: 'ข้อสอบ CEFR | CEFR Ready',
    description: TESTS_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ข้อสอบ CEFR | CEFR Ready',
    description: TESTS_DESCRIPTION,
  },
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
