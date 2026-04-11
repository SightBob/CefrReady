import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo Tests | CEFR Ready',
  description: 'ลองทดสอบภาษาอังกฤษฟรีโดยไม่ต้องสมัครสมาชิก — Focus on Form, Focus on Meaning, Form & Meaning, และ Listening',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
