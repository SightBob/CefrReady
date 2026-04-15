import type { Metadata } from 'next';
import { Prompt, Pridi } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SessionProvider } from 'next-auth/react';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';

const prompt = Prompt({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'], 
  variable: '--font-prompt' 
});

const pridi = Pridi({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'], 
  variable: '--font-pridi' 
});

export const metadata: Metadata = {
  title: 'CEFR Ready — แนวข้อสอบ CEFR มทส และมาตรฐานสากล',
  description: 'เตรียมพร้อมสอบ CEFR ด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ครอบคลุมระดับ A1 ถึง C2 เตรียมสอบ CEFR มทส (SUT) หรือมหาวิทยาลัยอื่นๆ ได้ที่นี่',
  keywords: ['CEFR', 'ข้อสอบ CEFR', 'แนวข้อสอบ CEFR มทส', 'สอบภาษาอังกฤษ มทส', 'CEFR SUT', 'เตรียมสอบ CEFR', 'ฟังภาษาอังกฤษ', 'เรียนภาษาอังกฤษ'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${prompt.variable} ${pridi.variable} font-sans`}>
        <SessionProvider>
          <div className="min-h-screen flex flex-col font-sans">
            <Header />
            <main className="flex-1">
              <Suspense>
                {children}
              </Suspense>
            </main>
            <Footer />
          </div>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
