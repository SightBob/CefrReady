import type { Metadata } from 'next';

const TESTS_DESCRIPTION =
  'ฝึกทำข้อสอบ CEFR แต่ละทักษะ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 พร้อมเฉลยทุกข้อ';

/**
 * metadata ระดับ subtree ของ /tests — เป็นค่าตั้งต้นของหน้าลูกที่ไม่ได้ประกาศเอง
 * openGraph/twitter ไม่ผ่าน template จึงใส่ชื่อเว็บเอง
 * ห้ามใส่ alternates ที่นี่ เพราะจะ cascade ไปทุกหน้าลูก
 *
 * ต้องใช้ title { default, template } — การประกาศ `title: '...'` (string) อย่างเดียวจะทับ
 * title object ของ root layout ทั้งก้อน (ทั้ง default และ template) ทำให้หน้าลูก /tests/*
 * (เช่น /tests/focus-form → "Focus on Form") ไม่มี suffix " | CEFR Ready" ต่อท้าย
 */
export const metadata: Metadata = {
  title: {
    default: 'ข้อสอบ CEFR | CEFR Ready',
    template: '%s | CEFR Ready', // ต้องตรงกับ title.template ใน src/app/layout.tsx (SITE_NAME)
  },
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
