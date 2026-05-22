import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import FlashcardsClient from '@/components/FlashcardsClient';

export const metadata: Metadata = {
  title: 'Flashcards ของฉัน | CEFR Ready',
  description: 'ทบทวนคำศัพท์ที่เก็บจากข้อสอบและบทความด้วย Flashcard',
  alternates: { canonical: 'https://cefr-ready.site/flashcards' },
  openGraph: {
    title: 'Flashcards ของฉัน | CEFR Ready',
    description: 'ทบทวนคำศัพท์ที่เก็บจากข้อสอบและบทความด้วย Flashcard',
    url: 'https://cefr-ready.site/flashcards',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flashcards ของฉัน | CEFR Ready',
    description: 'ทบทวนคำศัพท์ที่เก็บจากข้อสอบและบทความด้วย Flashcard',
  },
};

export default async function FlashcardsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <FlashcardsClient />;
}
