import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';
import ChromeShell from '@/components/ChromeShell';
import { SessionProvider } from 'next-auth/react';
import Script from 'next/script';
import { Suspense } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import TopLoadingBar from '@/components/TopLoadingBar';

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  variable: '--font-ibm',
  display: 'swap',
});

const BASE_URL = 'https://cefr-ready.site';
const SITE_NAME = 'CEFR Ready';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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

import ToasterWrapper from '@/components/ToasterWrapper';
import { PostHogProvider, PHCapture } from '@/lib/posthog';
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SECURITY: per-request CSP nonce issued by src/proxy.ts (report M1).
  // Reading headers() makes the layout dynamic — the standard trade-off of
  // nonce-based CSP.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="th">
      <head>
        <meta name="application-name" content={SITE_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* PostHog is the remaining third-party — warm the connection early. */}
        <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="" />
      </head>
      <body className={`${ibmPlexSansThai.variable} font-sans`}>
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        <SessionProvider refetchOnWindowFocus={false}>
          <PostHogProvider>
            <Suspense fallback={null}>
              <PHCapture />
            </Suspense>
            <ChromeShell
              headerFallback={<div className="h-16 bg-white border-b border-slate-100" aria-hidden="true" />}
              mainFallback={
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="space-y-4">
                    <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
                    <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="space-y-3 mt-6">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-white border border-slate-100 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  </div>
                </div>
              }
            >
              {children}
            </ChromeShell>
          </PostHogProvider>
        </SessionProvider>
        {/* PostHog (idle-initialized) is the single analytics provider now;
            GA and Vercel Analytics were removed to cut duplicate tracking JS. */}
        <SpeedInsights />
        <ToasterWrapper />
      </body>
    </html>
  );
}
