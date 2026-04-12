import type { Metadata } from 'next';
import DemoTestsSection from '@/components/DemoTestsSection';
import ProgressStats from '@/components/ProgressStats';
import { Sparkles, BookOpen, CheckCircle, Trophy, Target, Zap } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { userProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'CEFR Ready — ฝึกภาษาอังกฤษด้วยข้อสอบมาตรฐาน CEFR',
  description: 'ทดสอบและพัฒนาทักษะภาษาอังกฤษด้วยข้อสอบ Focus on Form, Focus on Meaning, Form & Meaning และ Listening ที่ออกแบบตามมาตรฐาน CEFR ครอบคลุมระดับ A1 ถึง C2',
};

const FEATURES = [
  { icon: Target, label: '120+ ข้อสอบ', desc: 'ครอบคลุมทุกทักษะ' },
  { icon: Trophy, label: 'ระดับ A1–C2', desc: 'มาตรฐาน CEFR' },
  { icon: CheckCircle, label: 'อธิบายทุกข้อ', desc: 'ด้วยภาษาที่เข้าใจง่าย' },
  { icon: Zap, label: 'ฟรี 100%', desc: 'ไม่มีค่าใช้จ่าย' },
];

export default async function Home() {
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
      // Non-fatal
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ═══════════════════════════════════════════ HERO ═══════════════════════════════════════════ */}
      <section className="relative text-center py-20 md:py-32 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-8 left-8 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="absolute bottom-8 right-8 w-80 h-80 bg-accent-100 rounded-full blur-3xl opacity-40 -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-5 py-2 rounded-full text-sm font-semibold mb-8">
          <Sparkles className="w-4 h-4" />
          ข้อสอบมาตรฐาน CEFR — A1 ถึง C2
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 leading-[1.1] tracking-tight">
          เตรียมพร้อม
          <span className="block bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600 bg-clip-text text-transparent">
            สอบ CEFR
          </span>
          ได้ทุกทักษะ
        </h1>

        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          ฝึกกับข้อสอบ <strong className="text-slate-700">Focus on Form</strong>, {' '}
          <strong className="text-slate-700">Focus on Meaning</strong>, {' '}
          <strong className="text-slate-700">Form &amp; Meaning</strong> และ{' '}
          <strong className="text-slate-700">Listening</strong>{' '}
          พร้อมคำอธิบายที่เข้าใจง่ายทุกข้อ
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Icon className="w-4 h-4 text-primary-500 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 leading-tight">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/tests" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
            <BookOpen className="w-5 h-5" />
            เริ่มทำข้อสอบ
          </Link>
          <Link href="/demo" className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-4">
            ลองทำตัวอย่าง
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ PROGRESS (logged in) ═══════════════════════════════════════════ */}
      {session?.user && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">ความก้าวหน้าของคุณ</h2>
            <Link 
              href="/progress" 
              className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <ProgressStats testsTaken={testsTaken} averageScore={averageScore} />
        </section>
      )}

      {/* ═══════════════════════════════════════════ DEMO ═══════════════════════════════════════════ */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">🎯 ลองทำข้อสอบตัวอย่าง</h2>
            <p className="text-sm text-slate-500 mt-1">ไม่ต้องสมัครสมาชิก</p>
          </div>
        </div>
        <DemoTestsSection showInfoBanner={false} />
      </section>
    </div>
  );
}
