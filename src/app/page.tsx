import type { Metadata } from 'next';
import DemoTestsSection from '@/components/DemoTestsSection';
import ProgressStats from '@/components/ProgressStats';
import {
  Sparkles,
  BookOpen,
  CheckCircle,
  Trophy,
  Target,
  Zap,
  ArrowRight,
  PenTool,
  Layers,
  Headphones,
} from 'lucide-react';
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

const TEST_TYPES = [
  { name: 'Focus on Form', count: '30', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', icon: PenTool },
  { name: 'Focus on Meaning', count: '30', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', icon: BookOpen },
  { name: 'Form & Meaning', count: '30', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', icon: Layers },
  { name: 'Listening', count: '30', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', icon: Headphones },
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
      {/* HERO — Split layout */}
      <section className="min-h-[85dvh] flex items-center relative overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-primary-50/50 to-accent-50/30 -z-10" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-accent-100/30 rounded-full blur-3xl -z-10" />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          {/* Left: Copy */}
          <div className="space-y-8">
            <div
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-full text-sm font-medium stagger-animate"
              style={{ animationDelay: '0ms' }}
            >
              <Sparkles className="w-4 h-4 text-primary-500" />
              ข้อสอบมาตรฐาน CEFR — A1 ถึง C2
            </div>

            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight stagger-animate"
              style={{ animationDelay: '100ms' }}
            >
              เตรียมพร้อม
              <br />
              <span className="text-primary-600">สอบ CEFR</span>
              <br />
              ได้ทุกทักษะ
            </h1>

            <p
              className="text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed stagger-animate"
              style={{ animationDelay: '200ms' }}
            >
              ฝึกกับข้อสอบ <strong className="text-slate-800">Focus on Form</strong>,{' '}
              <strong className="text-slate-800">Focus on Meaning</strong>,{' '}
              <strong className="text-slate-800">Form &amp; Meaning</strong> และ{' '}
              <strong className="text-slate-800">Listening</strong>{' '}
              พร้อมคำอธิบายที่เข้าใจง่ายทุกข้อ
            </p>

            <div
              className="flex items-center gap-4 flex-wrap stagger-animate"
              style={{ animationDelay: '300ms' }}
            >
              <Link href="/tests" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
                เริ่มทำข้อสอบ
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/demo" className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-4">
                ลองทำตัวอย่าง
              </Link>
            </div>

            <div
              className="flex flex-wrap items-center gap-3 stagger-animate"
              style={{ animationDelay: '400ms' }}
            >
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <Icon className="w-4 h-4 text-primary-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Test types grid */}
          <div className="hidden lg:grid grid-cols-2 gap-4 stagger-animate" style={{ animationDelay: '500ms' }}>
            {TEST_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.name}
                  className={`${type.bg} rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className={`bg-gradient-to-br ${type.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{type.name}</h3>
                  <p className="text-sm text-slate-500">{type.count} ข้อสอบ</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROGRESS — logged in only */}
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

      {/* DEMO */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">ลองทำข้อสอบตัวอย่าง</h2>
            <p className="text-sm text-slate-500 mt-1">ไม่ต้องสมัครสมาชิก</p>
          </div>
        </div>
        <DemoTestsSection showInfoBanner={false} />
      </section>
    </div>
  );
}
