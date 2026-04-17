import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import FlashcardsClient from '@/components/FlashcardsClient';

export const metadata: Metadata = {
  title: 'Flashcards ของฉัน | CefrReady',
  description: 'ทบทวนคำศัพท์ที่เก็บจากข้อสอบและบทความด้วย Flashcard',
};

export default async function FlashcardsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <FlashcardsClient />;
}
