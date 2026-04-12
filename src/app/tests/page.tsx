import type { Metadata } from 'next';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import SectionCard, { type SectionData } from '@/components/SectionCard';
import TestsLoginPrompt from './TestsLoginPrompt';

export const metadata: Metadata = {
  title: 'ข้อสอบ CEFR | CEFR Ready',
  description: 'เลือกทำข้อสอบ CEFR ที่ตรงกับระดับของคุณ ครอบคลุม Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2',
};

async function getSections(): Promise<SectionData[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/sections`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) return json.sections as SectionData[];
  } catch (err) {
    console.error('[tests/page] Failed to fetch sections:', err);
  }
  return [];
}

export default async function TestsPage() {
  const [session, sections] = await Promise.all([auth(), getSections()]);

  if (!session?.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Full Tests</h1>
          <p className="text-slate-600 mt-2">Complete tests with progress tracking and detailed results</p>
        </div>

        <TestsLoginPrompt />

        {/* Section Cards – disabled/blurred state */}
        <div className="relative mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 pointer-events-none">
            {sections.map((section) => (
              <div key={section.id} className="relative">
                <SectionCard section={section} disabled />
                <div className="absolute inset-0 bg-slate-100/50 rounded-2xl flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-slate-600">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">Login Required</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Want to try without logging in?</p>
          <Link href="/demo" className="btn-secondary inline-flex items-center gap-2">
            Try Demo Tests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Full Tests</h1>
        <p className="text-slate-600 mt-2">
          Welcome back,{' '}
          <span className="font-semibold text-primary-600">
            {session.user?.name || session.user?.email}
          </span>
          ! Select a section to begin.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">No test sections available yet.</p>
          <p className="text-sm mt-1">Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
