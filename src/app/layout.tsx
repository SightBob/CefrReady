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
const SITE_NAME = 'CEFR Ready';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  applicationName: SITE_NAME,
  publisher: SITE_NAME,
  authors: [{ name: SITE_NAME, url: BASE_URL }],
  creator: SITE_NAME,
  appleWebApp: {
    title: SITE_NAME,
    statusBarStyle: 'default',
    capable: true,
  },
  title: {
    default: 'CEFR Ready — แนวข้อสอบ CEFR มทส ฝึกทักษะภาษาอังกฤษออนไลน์',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'แพลตฟอร์มฝึกข้อสอบ CEFR ออนไลน์ฟรี ครอบคลุม Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 เหมาะสำหรับนักศึกษา มทส (SUT) และมหาวิทยาลัยที่ใช้มาตรฐาน CEFR',
  keywords: [
    'CEFR', 'ข้อสอบ CEFR', 'แนวข้อสอบ CEFR มทส', 'สอบภาษาอังกฤษ มทส',
    'CEFR SUT', 'เตรียมสอบ CEFR', 'ฝึกภาษาอังกฤษ', 'CEFR test online',
    'ข้อสอบภาษาอังกฤษ', 'แบบทดสอบ CEFR ออนไลน์', 'CEFR Ready',
    'Focus on Form', 'Focus on Meaning', 'Listening CEFR',
    'ข้อสอบมาตรฐาน CEFR A1 A2 B1 B2 C1 C2',
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: 'CEFR Ready — แนวข้อสอบ CEFR มทส และมาตรฐานสากล',
    description:
      'ฝึกข้อสอบ CEFR ฟรี ครบทุกทักษะ Focus on Form, Meaning, Listening ระดับ A1-C2 พร้อมคำอธิบายทุกข้อ',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'CEFR Ready — แนวข้อสอบ CEFR มทส',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CEFR Ready — แนวข้อสอบ CEFR มทส',
    description: 'ฝึกข้อสอบ CEFR ฟรี Focus on Form, Meaning, Listening A1-C2',
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
  icons: {
    icon: '/icon',
    shortcut: '/icon',
    apple: '/apple-icon',
  },
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        {/* Explicit favicon tags to override any cached Vercel defaults */}
        <link rel="icon" href="/icon" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/icon" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon" sizes="180x180" />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="generator" content={SITE_NAME} />
      </head>
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
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
