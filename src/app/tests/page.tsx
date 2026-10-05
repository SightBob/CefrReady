import type { Metadata } from 'next';
import { getCachedSections } from '@/lib/sections';
import { auth } from '@/lib/auth';
import TestsPageClient from './TestsPageClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ข้อสอบ CEFR ทุกทักษะ',
  description: 'เลือกทำข้อสอบ CEFR ที่ตรงกับระดับของคุณ ครอบคลุม Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2',
  alternates: { canonical: 'https://cefr-ready.site/tests' },
  openGraph: {
    title: 'ข้อสอบ CEFR ทุกทักษะ | CEFR Ready',
    description: 'เลือกทำข้อสอบ CEFR ที่ตรงกับระดับของคุณ ครอบคลุม Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2',
    url: 'https://cefr-ready.site/tests',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ข้อสอบ CEFR ทุกทักษะ | CEFR Ready',
    description: 'เลือกทำข้อสอบ CEFR ครอบคลุม Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2',
  },
};

async function getSections() {
  try {
    return await getCachedSections();
  } catch (err) {
    console.error('[tests/page] Failed to fetch sections:', err);
  }
  return [];
}

export default async function TestsPage() {
  const [sections, session] = await Promise.all([getSections(), auth()]);
  const user = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null }
    : null;
  return <TestsPageClient sections={sections} user={user} />;
}
