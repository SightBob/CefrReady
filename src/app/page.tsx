import type { Metadata } from 'next';
import { Suspense } from 'react';
import DemoTestsSection from '@/components/DemoTestsSection';
import HomeReviews from '@/components/HomeReviews';
import HomeClientOverlays from '@/components/HomeClientOverlays';
import FaqAccordion from '@/components/FaqAccordion';
import Image from "next/image";


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
  Clock,
  LayoutGrid,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CEFR Ready — ฝึกภาษาอังกฤษด้วยข้อสอบมาตรฐาน CEFR',
  description: 'ฝึกข้อสอบ CEFR ฟรี Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 พร้อมเฉลย',
  openGraph: {
    title: 'CEFR Ready — ฝึกภาษาอังกฤษด้วยข้อสอบมาตรฐาน CEFR',
    description: 'ฝึกข้อสอบ CEFR ฟรี Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 พร้อมเฉลย',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'CEFR Ready — แนวข้อสอบ CEFR มาตรฐานสากล' }],
  },
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

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* SEO: Structured Data */}
      <JsonLd data={websiteSchema()} />
      <JsonLd data={courseSchema()} />
      <JsonLd data={faqSchema([
        { question: 'CEFR คืออะไร?', answer: 'CEFR (Common European Framework of Reference for Languages) คือกรอบมาตรฐานสากลในการวัดระดับความสามารถทางภาษา แบ่งเป็น 6 ระดับ ตั้งแต่ A1 (เริ่มต้น) ถึง C2 (เชี่ยวชาญ) ใช้กันทั่วโลกและถูกนำมาใช้ในการวัดระดับภาษาอังกฤษของนักศึกษาในมหาวิทยาลัยไทย เช่น มทส (SUT)' },
        { question: 'ข้อสอบ CEFR Ready มีอะไรบ้าง?', answer: 'มี 4 ประเภท: (1) Focus on Form — ข้อสอบไวยากรณ์ เช่น tense, preposition, verb form (2) Focus on Meaning — ข้อสอบคำศัพท์ เช่น synonym, antonym (3) Form & Meaning — เติมคำในบทความ รวมไวยากรณ์และคำศัพท์ (4) Listening — ฟังบทสนทนาแล้วตอบคำถาม ครอบคลุมระดับ A1-C2' },
        { question: 'ใช้เตรียมสอบ CEFR ได้ไหม?', answer: 'ได้ครับ ข้อสอบออกแบบตามแนวข้อสอบ CEFR มาตรฐานสากล สามารถใช้เตรียมสอบ CEFR ที่มหาวิทยาลัยไทยหลายแห่ง รวมถึง มทส (Suranaree University of Technology / SUT) ได้' },
        { question: 'ใช้ CEFR Ready ฟรีหรือเปล่า?', answer: 'ฟรี 100% ไม่มีค่าใช้จ่ายใดๆ ทั้งสิ้น สามารถทำข้อสอบตัวอย่างได้โดยไม่ต้องสมัครสมาชิก สำหรับข้อสอบเต็มและการติดตามพัฒนาการ ต้องล็อกอินด้วย Google account' },
        { question: 'CEFR Ready ต้องล็อกอินไหม?', answer: 'ไม่จำเป็นสำหรับข้อสอบตัวอย่าง (Demo) 5 ข้อทุกประเภท แต่หากต้องการทำข้อสอบเต็ม 30 ข้อและดูพัฒนาการของตัวเอง ต้องล็อกอินด้วย Google account ซึ่งใช้เวลาไม่กี่วินาที' },
        { question: 'ข้อสอบ CEFR มีกี่ระดับ?', answer: 'CEFR มี 6 ระดับ: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Mastery) CEFR Ready ครอบคลุมทุกระดับตั้งแต่ A1 ถึง C2' },
        { question: 'คะแนนที่ต้องได้เพื่อผ่าน CEFR คือเท่าไร?', answer: 'ขึ้นอยู่กับมหาวิทยาลัยและสาขาวิชา โดยทั่วไปมักต้องผ่านระดับ B1 ขึ้นไป ควรตรวจสอบกับมหาวิทยาลัยของคุณโดยตรงสำหรับข้อกำหนดล่าสุด CEFR Ready ช่วยฝึกทุกระดับเพื่อให้คุณมั่นใจก่อนสอบจริง' },
      ])} />
      {/* HERO — Split layout */}
      <section
        className="
          min-h-dvh
          flex items-center relative overflow-hidden py-12
          -mt-16
          pt-24
          isolate
          before:absolute before:inset-0 before:-z-10
          before:bg-[linear-gradient(360deg,#F7AAFB_0%,#AA91F4_32%,#5675EB_67%,#5675EB_100%)]
          before:opacity-[86%]
        "
      >        {/* Background atmosphere */}



        <div className='absolute size-[9.375rem] top-[12.5rem] right-[-4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35'></div>
        <div className='absolute size-[3.125rem] top-[10.625rem] right-[4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35'></div>
        <div className='absolute size-[8.375rem] top-[12.5rem] left-[-4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35'></div>
        <div className='absolute size-[4.125rem] top-[20.625rem] left-[4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35'></div>
     <div className="absolute bottom-[-1px] left-0 w-full">
  <Image
    src="/icon_svg/headsection2.svg"
    alt=""
    width={1000}
    height={500}
    className="w-full h-auto"
  />
</div>

        <div className=" items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Left: Copy */}
          <div className="">

            <div
              className="flex flex-col items-center text-2xl sm:text-3xl md:text-[1.875rem] text-[#FFFFFF] font-bold !leading-[0.7] tracking-tight stagger-animate">
              <span>เตรียมพร้อมสอบกับ</span>
              <br />
              <span className="text-[#FFFFFF] text-5xl sm:text-6xl md:text-[4.375rem] leading-none">CEFR <span className='text-[#FDFF9E]'>Ready!</span></span>
              <br />
              <span className='text-sm sm:text-base md:text-[1.25rem] font-semibold leading-snug max-w-xs sm:max-w-md md:max-w-lg'>ข้อสอบครอบคลุมทุกทักษะ พร้อมคำอธิบายทุกข้อแบบเข้าใจง่าย</span>
            </div>


            <div
              className="flex items-center justify-center gap-3 flex-wrap stagger-animate mt-10 sm:mt-12"
              style={{ animationDelay: '300ms' }}
            >
              <div className='flex flex-wrap justify-center gap-3 bg-white px-3 py-2 rounded-full'>
                <Link href="/tests" className="bg-[#6D88EE] text-white rounded-full inline-flex items-center gap-2 text-sm md:text-base px-5 py-3 md:px-8 md:py-4" data-tour="hero-cta">
                เริ่มทำข้อสอบ
              </Link>
              <Link href="/demo" className="bg-[#F0F0F0] rounded-full inline-flex items-center gap-2 text-sm md:text-base px-5 py-3 md:px-8 md:py-4">
                ลองทำตัวอย่าง
              </Link>
              </div>
            </div>

          </div>

          {/* Right: Test types grid — 1 col mobile, 2 col tablet, 4 col desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 stagger-animate mt-8 sm:mt-10 md:mt-12 bg-white bg-opacity-35 rounded-[2.75rem] p-4 sm:p-6 md:p-[2rem]" style={{ animationDelay: '500ms' }}>
            {TEST_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.name}
                  className={`bg-[#F8F8F8] rounded-2xl p-4 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className={`bg-gradient-to-br ${type.color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base mb-1">{type.name}</h3>
                  <p className='text-xs sm:text-sm md:text-[0.885rem]'>ทดสอบความรู้ของคุณเกี่ยวกับ โครงสร้างไวยากรณ์ รูปแบบคำกริยา และแพทเทิร์นประโยค</p>

                  <div className='flex items-center space-x-4 mt-6 md:mt-8'>
                    <div className='flex items-center space-x-2 md:space-x-3'>
                      <Clock className="w-4 h-4" />
                      <p className="text-xs md:text-sm text-slate-500">{type.count} นาที</p>
                    </div>
                    <div className='flex items-center space-x-2 md:space-x-3'>
                       <LayoutGrid className="w-4 h-4" />
                      <p className="text-xs md:text-sm text-slate-500">9 เซ็ต</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROGRESS — logged in only, streamed separately to not block LCP */}
      <Suspense fallback={null}>
        <HomeReviews />
      </Suspense>

      {/* DEMO */}
      <section className="!bg-white min-h-[400px] relative sm:px-6 lg:px-8 mx-auto max-w-7xl mb-10">
        <div className="w-[162px] h-[15px] mx-auto bg-[#E5E7F6] rounded-full "></div>

        <div className="flex flex-col items-center justify-center mt-12">
          <h2 className='text-[#48507C] text-[2.25rem] font-semibold'>คะแนนระดับ  A1 - C2</h2>
          <p className='mt-1 text-[#5F6999] text-[1.25rem]'>ยินดีต้อนรับเข้าสู่การฝึกซ้อมทำข้อสอบ โดยเลือกประเภท...</p>
        </div>

        <div className="grid grid-cols-2 mt-12 gap-x-20">

  {/* A1 */}
  <div className="grid col-span-1 border-t-[3px]">
    <div className="flex justify-around items-center text-[#787878] py-[2rem]">
      <div className="w-[50%] flex items-center justify-center">
        <p className="font-semibold text-[1.25rem]">
          A1 พื้นฐาน
        </p>
      </div>

      <div className="w-[50%] flex items-center justify-center">
        <div className="bg-[#EADEFF] px-12 rounded-full py-1 text-[1.125rem]">
          1-20 คะแนน
        </div>
      </div>
    </div>
  </div>

  {/* A2 */}
  <div className="grid col-span-1 border-t-[3px]">
    <div className="flex justify-around items-center text-[#787878] py-[2rem]">
      <div className="w-[50%] flex items-center justify-center">
        <p className="font-semibold text-[1.25rem]">
          A2 ขั้นต้น (ผ่านเกณฑ์ มทส.)
        </p>
      </div>

      <div className="w-[50%] flex items-center justify-center">
        <div className="bg-[#EADEFF] px-12 rounded-full py-1 text-[1.125rem]">
          21-40 คะแนน
        </div>
      </div>
    </div>
  </div>

  {/* B1 */}
  <div className="grid col-span-1 border-t-[3px]">
    <div className="flex justify-around items-center text-[#787878] py-[2rem]">
      <div className="w-[50%] flex items-center justify-center">
        <p className="font-semibold text-[1.25rem]">
          B1 ขั้นกลาง
        </p>
      </div>

      <div className="w-[50%] flex items-center justify-center">
        <div className="bg-[#EADEFF] px-12 rounded-full py-1 text-[1.125rem]">
          41-60 คะแนน
        </div>
      </div>
    </div>
  </div>

  {/* B2 */}
  <div className="grid col-span-1 border-t-[3px]">
    <div className="flex justify-around items-center text-[#787878] py-[2rem]">
      <div className="w-[50%] flex items-center justify-center">
        <p className="font-semibold text-[1.25rem]">
          B2 กลาง - สูง
        </p>
      </div>

      <div className="w-[50%] flex items-center justify-center">
        <div className="bg-[#EADEFF] px-12 rounded-full py-1 text-[1.125rem]">
          61-80 คะแนน
        </div>
      </div>
    </div>
  </div>

  {/* C1 */}
  <div className="grid col-span-1 border-t-[3px] border-b-[3px]">
    <div className="flex justify-around items-center text-[#787878] py-[2rem]">
      <div className="w-[50%] flex items-center justify-center">
        <p className="font-semibold text-[1.25rem]">
          C1 ขั้นสูง
        </p>
      </div>

      <div className="w-[50%] flex items-center justify-center ">
        <div className="bg-[#EADEFF] px-12 rounded-full py-1 text-[1.125rem]">
          81-100 คะแนน
        </div>
      </div>
    </div>
  </div>

  {/* C2 */}
  <div className="grid col-span-1 border-t-[3px] border-b-[3px]">
    <div className="flex justify-around items-center text-[#787878] py-[2rem]">
      <div className="w-[50%] flex items-center justify-center">
        <p className="font-semibold text-[1.25rem]">
          C2 เชี่ยวชาญ
        </p>
      </div>

      <div className="w-[50%] flex items-center justify-center">
        <div className="bg-[#EADEFF] px-12 rounded-full py-1 text-[1.125rem]">
          101-120 คะแนน
        </div>
      </div>
    </div>
  </div>

</div>
      </section>

      {/* CTA Section — SEO target section */}
      <section className="mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-primary-700 rounded-3xl px-8 py-12 md:px-16 md:py-16 text-white">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary-200 mb-4">
              สำหรับนักศึกษามหาวิทยาลัยที่ต้องสอบ CEFR
            </span>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
              เตรียมสอบ CEFR<br />
              <span className="text-primary-200">ให้ผ่านในครั้งแรก</span>
            </h2>
            <p className="text-primary-100 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              CEFR Ready ออกแบบตามแนวข้อสอบ CEFR มาตรฐานสากล ที่สอดคล้องกับรูปแบบข้อสอบ CEFR ที่มหาวิทยาลัยไทยหลายแห่งนำมาใช้วัดระดับ ภาษาอังกฤษของนักศึกษา ครอบคลุมทั้ง 4 ทักษะ:{' '}
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
        </div>
      </section>

      {/* FAQ Section — visible on page for SEO */}
      <section className="mb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              คำถามที่พบบ่อย
            </h2>
            <p className="text-slate-500">เกี่ยวกับ CEFR Ready และการสอบ CEFR</p>
          </div>
          <FaqAccordion />
        </div>
        </div>
      </section>

      {/* Product Tour for first-time users */}
      <HomeClientOverlays />
    </div>
  );
}
