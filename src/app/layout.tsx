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

const BASE_URL = 'https://cefr-ready.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'CEFR Ready — แนวข้อสอบ CEFR มทส และมาตรฐานสากล',
    template: '%s | CEFR Ready',
  },
  description: 'เตรียมพร้อมสอบ CEFR ด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ครอบคลุมระดับ A1 ถึง C2 เตรียมสอบ CEFR มทส (SUT) หรือมหาวิทยาลัยอื่นๆ ได้ที่นี่',
  keywords: ['CEFR', 'ข้อสอบ CEFR', 'แนวข้อสอบ CEFR มทส', 'สอบภาษาอังกฤษ มทส', 'CEFR SUT', 'เตรียมสอบ CEFR', 'ฟังภาษาอังกฤษ', 'เรียนภาษาอังกฤษ', 'CEFR test online', 'ข้อสอบภาษาอังกฤษ', 'แบบทดสอบ CEFR ออนไลน์'],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: BASE_URL,
    siteName: 'CEFR Ready',
    title: 'CEFR Ready — แนวข้อสอบ CEFR มทส และมาตรฐานสากล',
    description: 'ฝึกทำข้อสอบ CEFR ฟรี ครอบคลุม Focus on Form, Meaning, Listening ระดับ A1-C2 พร้อมคำอธิบายทุกข้อ',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'CEFR Ready' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CEFR Ready — แนวข้อสอบ CEFR มทส และมาตรฐานสากล',
    description: 'ฝึกทำข้อสอบ CEFR ฟรี ครอบคลุม Focus on Form, Meaning, Listening ระดับ A1-C2',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: { google: '1-4RDuUm7NJv9vcUaVgh3o02J-A49I1Ydw7FrZn4xt0' },
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
