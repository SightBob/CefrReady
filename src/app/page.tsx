import type { Metadata } from 'next';
import DemoTestsSection from '@/components/DemoTestsSection';
import ProgressStats from '@/components/ProgressStats';
import FaqAccordion from '@/components/FaqAccordion';
import JsonLd, { websiteSchema, courseSchema, faqSchema } from '@/components/JsonLd';
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
import HomeTour from '@/components/HomeTour';

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
      {/* SEO: Structured Data */}
      <JsonLd data={websiteSchema()} />
      <JsonLd data={courseSchema()} />
      <JsonLd data={faqSchema([
        { question: 'CEFR คืออะไร?', answer: 'CEFR (Common European Framework of Reference for Languages) คือกรอบมาตรฐานสากลในการวัดระดับความสามารถทางภาษา แบ่งเป็น 6 ระดับ ตั้งแต่ A1 (เริ่มต้น) ถึง C2 (เชี่ยวชาญ) ใช้กันทั่วโลกและถูกนำมาใช้ในการวัดระดับภาษาอังกฤษของนักศึกษาในมหาวิทยาลัยไทย เช่น มทส (SUT)' },
        { question: 'ข้อสอบ CEFR Ready มีอะไรบ้าง?', answer: 'มี 4 ประเภท: (1) Focus on Form — ข้อสอบไวยากรณ์ เช่น tense, preposition, verb form (2) Focus on Meaning — ข้อสอบคำศัพท์ เช่น synonym, antonym (3) Form & Meaning — เติมคำในบทความ รวมไวยากรณ์และคำศัพท์ (4) Listening — ฟังบทสนทนาแล้วตอบคำถาม ครอบคลุมระดับ A1-C2' },
        { question: 'ใช้เตรียมสอบ CEFR มทส ได้ไหม?', answer: 'ได้ครับ ข้อสอบออกแบบตามแนวข้อสอบ CEFR มาตรฐานสากล สามารถใช้เตรียมสอบ CEFR ที่ มทส (Suranaree University of Technology / SUT) และมหาวิทยาลัยอื่นๆ ที่ใช้มาตรฐาน CEFR ได้' },
        { question: 'ใช้ CEFR Ready ฟรีหรือเปล่า?', answer: 'ฟรี 100% ไม่มีค่าใช้จ่ายใดๆ ทั้งสิ้น สามารถทำข้อสอบตัวอย่างได้โดยไม่ต้องสมัครสมาชิก สำหรับข้อสอบเต็มและการติดตามพัฒนาการ ต้องล็อกอินด้วย Google account' },
        { question: 'CEFR Ready ต้องล็อกอินไหม?', answer: 'ไม่จำเป็นสำหรับข้อสอบตัวอย่าง (Demo) 5 ข้อทุกประเภท แต่หากต้องการทำข้อสอบเต็ม 30 ข้อและดูพัฒนาการของตัวเอง ต้องล็อกอินด้วย Google account ซึ่งใช้เวลาไม่กี่วินาที' },
        { question: 'ข้อสอบ CEFR มีกี่ระดับ?', answer: 'CEFR มี 6 ระดับ: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Mastery) CEFR Ready ครอบคลุมทุกระดับตั้งแต่ A1 ถึง C2' },
        { question: 'คะแนนที่ต้องได้เพื่อผ่าน CEFR มทส คือเท่าไร?', answer: 'โดยทั่วไปนักศึกษา มทส ต้องผ่านระดับ B1 ขึ้นไป แต่ขึ้นอยู่กับสาขาวิชาและรุ่นปีด้วย ควรตรวจสอบกับทาง มทส โดยตรงสำหรับข้อกำหนดล่าสุด CEFR Ready ช่วยฝึกทุกระดับเพื่อให้คุณมั่นใจก่อนสอบจริง' },
      ])} />
      {/* HERO — Split layout */}
      <section className="min-h-[75dvh] md:min-h-[80dvh] lg:min-h-[85dvh] flex items-center relative overflow-hidden py-12 md:py-0">
        {/* Background atmosphere */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-primary-50/50 to-accent-50/30 -z-10" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-accent-100/30 rounded-full blur-3xl -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
          {/* Left: Copy */}
          <div className="space-y-6 md:space-y-8">
            <div
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium stagger-animate"
              style={{ animationDelay: '0ms' }}
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-500 shrink-0" />
              ข้อสอบมาตรฐาน CEFR — A1 ถึง C2
            </div>

            <h1
              className="text-[3rem] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight stagger-animate"
              style={{ animationDelay: '100ms' }}
            >
              เตรียมพร้อม
              <br />
              <span className="text-primary-600">สอบ CEFR</span>
              <br />
              ได้ทุกทักษะ
            </h1>

            <p
              className="text-base md:text-lg lg:text-xl text-slate-600 max-w-xl leading-relaxed stagger-animate"
              style={{ animationDelay: '200ms' }}
            >
              ฝึกกับข้อสอบ <strong className="text-slate-800">Focus on Form</strong>,{' '}
              <strong className="text-slate-800">Focus on Meaning</strong>,{' '}
              <strong className="text-slate-800">Form &amp; Meaning</strong> และ{' '}
              <strong className="text-slate-800">Listening</strong>{' '}
              พร้อมคำอธิบายที่เข้าใจง่ายทุกข้อ
            </p>

            <div
              className="flex items-center gap-3 flex-wrap stagger-animate"
              style={{ animationDelay: '300ms' }}
            >
              <Link href="/tests" className="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-3 md:px-8 md:py-4" data-tour="hero-cta">
                เริ่มทำข้อสอบ
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
              <Link href="/demo" className="btn-secondary inline-flex items-center gap-2 text-sm md:text-base px-5 py-3 md:px-8 md:py-4">
                ลองทำตัวอย่าง
              </Link>
            </div>

            <div
              className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 md:gap-3 stagger-animate"
              style={{ animationDelay: '400ms' }}
            >
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs md:text-sm font-semibold text-slate-800 leading-tight">{label}</p>
                    <p className="text-xs text-slate-400 hidden sm:block">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Test types grid — hidden on small mobile, shown from sm up */}
          <div className="hidden sm:grid grid-cols-2 gap-3 md:gap-4 stagger-animate" style={{ animationDelay: '500ms' }}>
            {TEST_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.name}
                  className={`${type.bg} rounded-2xl p-4 md:p-6 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className={`bg-gradient-to-br ${type.color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base mb-1">{type.name}</h3>
                  <p className="text-xs md:text-sm text-slate-500">{type.count} ข้อสอบ</p>
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

      {/* SUT / มทส CTA Section — SEO target section */}
      <section className="mb-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-primary-700 rounded-3xl px-8 py-12 md:px-16 md:py-16 text-white">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary-200 mb-4">
              สำหรับ นักศึกษา มทส โดยเฉพาะ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              เตรียมสอบ CEFR มทส<br />
              <span className="text-primary-200">ให้ผ่านในครั้งแรก</span>
            </h2>
            <p className="text-primary-100 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              CEFR Ready ออกแบบตามแนวข้อสอบ CEFR มาตรฐานสากล ที่{' '}
              <strong className="text-white">มหาวิทยาลัยเทคโนโลยีสุรนารี (มทส / SUT)</strong>{' '}
              ใช้วัดระดับภาษาอังกฤษของนักศึกษา ครอบคลุมทั้ง 4 ทักษะ:{' '}
              Focus on Form, Focus on Meaning, Form &amp; Meaning และ Listening
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tests"
                className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors"
              >
                เริ่มทำข้อสอบ CEFR ฟรี
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 bg-primary-800/60 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-800 transition-colors"
              >
                ลองทำตัวอย่างก่อน
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section — visible on page for SEO */}
      <section className="mb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              คำถามที่พบบ่อย
            </h2>
            <p className="text-slate-500">เกี่ยวกับ CEFR Ready และการสอบ CEFR มทส</p>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* Product Tour for first-time users */}
      <HomeTour />
    </div>
  );
}
