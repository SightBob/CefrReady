import type { Metadata } from 'next';
import { Prompt, Pridi } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SessionProvider } from 'next-auth/react';
import Script from 'next/script';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics } from '@next/third-parties/google';

const prompt = Prompt({
  weight: ['400', '500', '600', '700', '900'],
  subsets: ['latin', 'thai'],
  variable: '--font-prompt',
  display: 'swap',
});

const pridi = Pridi({
  weight: ['400', '700'],
  subsets: ['latin', 'thai'],
  variable: '--font-pridi',
  display: 'swap',
});

const BASE_URL = 'https://cefr-ready.site';
const SITE_NAME = 'CEFR Ready';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

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
    default: 'CEFR Ready — แนวข้อสอบ CEFR มาตรฐานสากล ฝึกทักษะภาษาอังกฤษออนไลน์',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'แพลตฟอร์มฝึกข้อสอบ CEFR ออนไลน์ฟรี ครอบคลุม Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 เหมาะสำหรับนักศึกษามหาวิทยาลัยที่ต้องสอบ CEFR',
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
    title: 'CEFR Ready — แนวข้อสอบ CEFR มาตรฐานสากล',
    description:
      'ฝึกข้อสอบ CEFR ฟรี ครบทุกทักษะ Focus on Form, Meaning, Listening ระดับ A1-C2 พร้อมคำอธิบายทุกข้อ',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'CEFR Ready — แนวข้อสอบ CEFR มาตรฐานสากล',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CEFR Ready — แนวข้อสอบ CEFR มาตรฐานสากล',
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

import CookieYesScript from '@/components/CookieYesScript';
import ToasterWrapper from '@/components/ToasterWrapper';
import { PostHogProvider, PHCapture } from '@/lib/posthog';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <meta name="application-name" content={SITE_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${prompt.variable} ${pridi.variable} font-sans`}>
        <SessionProvider refetchOnWindowFocus={false}>
          <PostHogProvider>
            <Suspense fallback={null}>
              <PHCapture />
            </Suspense>
            <div className="min-h-screen flex flex-col font-sans">
              <Suspense fallback={null}>
                <Header />
              </Suspense>
              <main className="flex-1">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-pulse flex flex-col items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary-200" />
                      <p className="text-sm text-slate-400">Loading...</p>
                    </div>
                  </div>
                }>
                  {children}
                </Suspense>
              </main>
              <Footer />
            </div>
          </PostHogProvider>
        </SessionProvider>
        <Analytics />
        <GoogleAnalytics gaId="G-MNPQ9B7ZDL" />
        <SpeedInsights />
        <ToasterWrapper />
      </body>
    </html>
  );
}
