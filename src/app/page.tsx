import type { Metadata } from 'next';
import DemoTestsSection from '@/components/DemoTestsSection';
import ProgressStats from '@/components/ProgressStats';
import { Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { userProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'CEFR Ready — ฝึกภาษาอังกฤษด้วยข้อสอบมาตรฐาน CEFR',
  description: 'ทดสอบและพัฒนาทักษะภาษาอังกฤษด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ที่ออกแบบตามมาตรฐาน CEFR',
};


export default async function Home() {
  // Fetch real progress data for logged-in users
  const session = await auth();
  let testsTaken = 0;
  let averageScore = 0;

  if (session?.user?.id) {
    try {
      const progressRows = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, session.user.id));

      if (progressRows.length > 0) {
        let totalTests = 0;
        let totalScore = 0;
        for (const p of progressRows) {
          const taken = p.testsTaken || 0;
          const avg =
            typeof p.averageScore === 'string'
              ? parseFloat(p.averageScore)
              : p.averageScore || 0;
          totalTests += taken;
          totalScore += avg * taken;
        }
        testsTaken = totalTests;
        averageScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;
      }
    } catch {
      // Non-fatal — show empty stats on error
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          CEFR Aligned English Tests
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
          Master Your English
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Proficiency</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Comprehensive tests covering grammar, vocabulary, and listening skills aligned with CEFR standards.
        </p>
        <Link href="/must-know" className="btn-primary inline-flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5" />
          Must Know
        </Link>
      </section>

      {/* Progress Stats */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Your Progress</h2>
        <ProgressStats testsTaken={testsTaken} averageScore={averageScore} />
      </section>

      {/* Demo Tests Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">🎯 Try a Demo</h2>
          <span className="text-sm text-slate-500 flex items-center gap-1">
            No login required
          </span>
        </div>
        <DemoTestsSection showInfoBanner={false} />
      </section>
    </div>
  );
}

