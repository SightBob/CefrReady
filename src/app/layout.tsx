import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { SessionProvider } from 'next-auth/react';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CEFR Ready — ฝึกภาษาอังกฤษ มาตรฐาน CEFR',
  description: 'เตรียมพร้อมสอบ CEFR ด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ครอบคลุมระดับ A1 ถึง C2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <SessionProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Suspense>
                {children}
              </Suspense>
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
