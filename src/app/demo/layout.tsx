import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ทดลองทำข้อสอบ CEFR ฟรี',
  description: 'ลองทดสอบภาษาอังกฤษฟรีโดยไม่ต้องสมัครสมาชิก — Focus on Form, Focus on Meaning, Form & Meaning, และ Listening',
  // ไม่ใส่ alternates ที่นี่: canonical จะ cascade ไปหน้าลูก (เช่น /demo/exam)
  // แล้วชี้กลับ /demo — แต่ละหน้าลูกประกาศ canonical ของตัวเอง
  openGraph: {
    title: 'ทดลองทำข้อสอบ CEFR ฟรี | CEFR Ready',
    description: 'ลองทดสอบภาษาอังกฤษฟรีโดยไม่ต้องสมัครสมาชิก — Focus on Form, Focus on Meaning, Form & Meaning, และ Listening',
    url: 'https://cefr-ready.site/demo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ทดลองทำข้อสอบ CEFR ฟรี | CEFR Ready',
    description: 'ลองทดสอบภาษาอังกฤษฟรีโดยไม่ต้องสมัครสมาชิก ระดับ A1-C2',
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
