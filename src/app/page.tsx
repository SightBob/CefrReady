import type { Metadata } from 'next';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import DemoTestsSection from '@/components/DemoTestsSection';
import HomeReviews from '@/components/HomeReviews';
import FaqAccordion from '@/components/FaqAccordion';
import HomeTestTypes from '@/components/HomeTestTypes';
import Image from "next/image";


import JsonLd, { websiteSchema, courseSchema, faqSchema } from '@/components/JsonLd';
import {
  CheckCircle,
  Trophy,
  Target,
  Zap,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { fetchSectionsFromDb } from '@/lib/sections';
import { auth } from '@/lib/auth';

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

const getCachedSections = unstable_cache(
  async () => fetchSectionsFromDb(),
  ['home-page-sections'],
  { revalidate: 300, tags: ['sections'] }
);

export default async function Home() {
  const [sections, session] = await Promise.all([
    getCachedSections().catch((err) => {
      console.error('[home/page] Failed to fetch sections:', err);
      return [] as Awaited<ReturnType<typeof fetchSectionsFromDb>>;
    }),
    auth(),
  ]);
  const isAuthenticated = Boolean(session?.user);
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
    -mt-[10px]
    isolate
    before:absolute before:inset-0 before:-z-10
    before:bg-[linear-gradient(360deg,#F7AAFB_0%,#AA91F4_32%,#5675EB_67%,#5675EB_100%)]
    before:opacity-[86%]
    pb-20 sm:pb-[7.5rem]
  "
>
  {/* Background atmosphere */}
  <div className="absolute size-[6.75rem] top-[11.875rem] left-[-4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35 scale-75 sm:scale-100"></div>
  <div className="absolute size-[3.75rem] top-[17.75rem] left-[30px] rounded-full bg-[#FFFFFF] bg-opacity-35 scale-75 sm:scale-100"></div>
  <div className="absolute size-[8.8125rem] top-[10.8125rem] right-[-4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35 scale-75 sm:scale-100"></div>
  <div className="absolute size-[3.75rem] top-[9.5625rem] right-[4.688rem] rounded-full bg-[#FFFFFF] bg-opacity-35 scale-75 sm:scale-100"></div>
  <div className="absolute size-[20rem] bottom-[7rem] left-[50%] translate-x-[-50%] rounded-full bg-white/35 blur-[60px] -z-10 scale-75 sm:scale-100"></div>

  <div className="absolute bottom-[-1px] left-0 w-full">
    <Image
      src="/icon_svg/headsection2.svg"
      alt=""
      width={1000}
      height={1000}
      className="w-full"
    />
  </div>

  <div className="items-center w-full max-w-[1360px] mx-auto mt-[1.0625rem] px-4 sm:px-6 lg:px-8">
    {/* Left: Copy */}
    <div>
      <div className="flex flex-col items-center text-2xl sm:text-3xl md:text-[1.875rem] text-[#FFFFFF] font-bold leading-[0.85] sm:!leading-[0.7] tracking-tight stagger-animate">
        <span>เตรียมพร้อมสอบกับ</span>
        <br />
        <span className="text-[#FFFFFF] text-5xl sm:text-6xl md:text-[4.375rem] leading-none text-center">
          CEFR <span className="text-[#FDFF9E]">Ready!</span>
        </span>
        <br />
        <span className="text-sm sm:text-base md:text-[1.25rem] font-semibold leading-snug text-center">
          ข้อสอบครอบคลุมทุกทักษะ พร้อมคำอธิบายทุกข้อแบบเข้าใจง่าย
        </span>
      </div>

      <div
  className="flex items-center justify-center gap-2 sm:gap-3 stagger-animate mt-[2.063rem] px-4 sm:px-0"
  style={{ animationDelay: '300ms' }}
>
  <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 bg-white p-2 rounded-full w-full sm:w-auto max-w-[26rem] sm:max-w-none">
    <Link
      href="/tests"
      className="bg-[#6D88EE] py-3 px-4 sm:px-6 font-semibold text-white rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base whitespace-nowrap flex-1 sm:flex-none sm:min-w-[13.813rem]"
    >
      <p className="mx-auto text-[1.125rem]">เริ่มสอบเลย</p>
    </Link>
    <Link
      href="/demo"
      className="bg-[#F0F0F0] text-[#585D6E] font-semibold rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base px-3 sm:px-6 py-3 whitespace-nowrap flex-1 sm:flex-none"
    >
      ลองทำตัวอย่าง
    </Link>
  </div>
</div>
    </div>

    {/* Right: Test types grid — 1 col mobile, 2 col tablet, 4 col desktop */}
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 stagger-animate mt-[2.313rem] bg-white bg-opacity-35 rounded-[2.75rem] p-4 sm:p-6 md:p-[2rem] max-sm:rounded-[1.75rem]"
      style={{ animationDelay: '500ms' }}
    >
      <HomeTestTypes sections={sections} isAuthenticated={isAuthenticated} />
    </div>
  </div>
</section>

      {/* PROGRESS — logged in only, streamed separately to not block LCP */}
      <div id="reviews" className="scroll-mt-[85px]">
        <Suspense fallback={null}>
          <HomeReviews />
        </Suspense>
      </div>

      {/* คะแนนระดับ A1 - C2 */}
  <section id="levels" className="!bg-white min-h-[400px] relative mx-auto mb-[5.5rem] overflow-hidden scroll-mt-[85px]">

        <div className='max-[1276px]:hidden absolute size-[6.75rem] top-[12.8125rem] left-[-3rem] rounded-full bg-[#E4CCFB]'></div>
        <div className='max-[1276px]:hidden absolute size-[2.9375rem] top-[10.0625rem] left-[3.125rem] rounded-full bg-[#A8B2F5]'></div>
        <div className='max-[1276px]:hidden absolute size-[8.8125rem] top-[14.5625rem] right-[-4.688rem] rounded-full bg-[#E4CCFB]'></div>
        <div className='max-[1276px]:hidden absolute size-[2.75rem] top-[22.25rem] right-[4.0625rem] rounded-full bg-[#A8B2F5]'></div>
  
   <div className='mx-auto  max-w-[1204px]'>
    <div className="w-[120px] sm:w-[162px] h-[12px] sm:h-[15px] mx-auto bg-[#E5E7F6] rounded-full"></div>

        <div className="flex flex-col items-center justify-center mt-[40px] px-2 text-center">
          <h2 className='text-[#48507C] text-2xl sm:text-[2.25rem] font-bold leading-tight'>คะแนนระดับ A1 - C2</h2>
          <p className='mt-2 sm:mt-1 text-[#5F6999] text-sm sm:text-[1.25rem] font-medium'>ยินดีต้อนรับเข้าสู่การฝึกซ้อมทำข้อสอบ โดยเลือกประเภท...</p>
        </div>

<div className="grid grid-cols-1 lg:grid-cols-2 mt-[3.0625rem] sm:mt-12 gap-x-6 md:gap-x-[3.625rem]">

  {/* A1 */}
  <div className="grid grid-cols-[1fr_auto] items-center border-t-[1px] border-[#EFEFEF] text-[#585858] py-8 px-6 sm:px-10 lg:px-16 xl:px-[77px]">
    <div className="flex items-center justify-start">
      <p className="font-bold text-base sm:text-[1.25rem]">
        A1 พื้นฐาน
      </p>
    </div>

    <div className="flex items-center justify-end">
      <div className="bg-[#EADEFF] font-medium min-w-[180px] text-center w-full rounded-full py-2 text-sm sm:text-[1.125rem] whitespace-nowrap">
        1-20 คะแนน
      </div>
    </div>
  </div>

  {/* A2 */}
  <div className="grid grid-cols-[1fr_auto] items-center border-t-[1px] border-[#EFEFEF] text-[#585858] py-8 px-6 sm:px-10 lg:px-16 xl:px-[77px]">
    <div className="flex items-center justify-start min-w-0">
      <p className="font-bold text-base sm:text-[1.25rem]">
        A2 ขั้นต้น (ผ่านเกณฑ์ มทส.)
      </p>
    </div>

    <div className="flex items-center justify-end ml-4">
      <div className="bg-[#EADEFF] font-medium min-w-[180px] text-center w-full rounded-full py-2 text-sm sm:text-[1.125rem] whitespace-nowrap">
        21-40 คะแนน
      </div>
    </div>
  </div>

  {/* B1 */}
  <div className="grid grid-cols-[1fr_auto] items-center border-t-[1px] border-[#EFEFEF] text-[#585858] py-8 px-6 sm:px-10 lg:px-16 xl:px-[77px]">
    <div className="flex items-center justify-start min-w-0">
      <p className="font-bold text-base sm:text-[1.25rem]">
        B1 ขั้นกลาง
      </p>
    </div>

    <div className="flex items-center justify-end ml-4">
      <div className="bg-[#EADEFF] font-medium min-w-[180px] text-center w-full rounded-full py-2 text-sm sm:text-[1.125rem] whitespace-nowrap">
        41-60 คะแนน
      </div>
    </div>
  </div>

  {/* B2 */}
  <div className="grid grid-cols-[1fr_auto] items-center border-t-[1px] border-[#EFEFEF] text-[#585858] py-8 px-6 sm:px-10 lg:px-16 xl:px-[77px]">
    <div className="flex items-center justify-start min-w-0">
      <p className="font-bold text-base sm:text-[1.25rem]">
        B2 กลาง - สูง
      </p>
    </div>

    <div className="flex items-center justify-end ml-4">
      <div className="bg-[#EADEFF] font-medium min-w-[180px] text-center w-full rounded-full py-2 text-sm sm:text-[1.125rem] whitespace-nowrap">
        61-80 คะแนน
      </div>
    </div>
  </div>

  {/* C1 */}
  <div className="grid grid-cols-[1fr_auto] items-center border-t-[1px] border-[#EFEFEF] lg:border-b-[1px] text-[#585858] py-8 px-6 sm:px-10 lg:px-16 xl:px-[77px]">
    <div className="flex items-center justify-start min-w-0">
      <p className="font-bold text-base sm:text-[1.25rem]">
        C1 ขั้นสูง
      </p>
    </div>

    <div className="flex items-center justify-end ml-4">
      <div className="bg-[#EADEFF] font-medium min-w-[180px] text-center w-full rounded-full py-2 text-sm sm:text-[1.125rem] whitespace-nowrap">
        81-100 คะแนน
      </div>
    </div>
  </div>

  {/* C2 */}
  <div className="grid grid-cols-[1fr_auto] items-center border-t-[1px] border-[#EFEFEF] border-b-[1px] text-[#585858] py-8 px-6 sm:px-10 lg:px-16 xl:px-[77px]">
    <div className="flex items-center justify-start min-w-0">
      <p className="font-bold text-base sm:text-[1.25rem]">
        C2 เชี่ยวชาญ
      </p>
    </div>

    <div className="flex items-center justify-end ml-4">
      <div className="bg-[#EADEFF] font-medium min-w-[180px] text-center w-full rounded-full py-2 text-sm sm:text-[1.125rem] whitespace-nowrap">
        101-120 คะแนน
      </div>
    </div>
  </div>

</div>
   </div>

      </section>

      {/* CTA Section — SEO target section */}
      <section id="packages" className="mb-20 scroll-mt-[85px]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#7339A0_0%,#3D95C5_100%)] rounded-3xl px-8 py-12 md:px-16 md:py-16 text-white">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/15 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/15 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 w-full text-center">
            <span className=" text-[2.25rem] font-bold uppercase text-[#FFFFFF] mb-4 mx-auto ">
              แพ็กเกจและโปรโมชั่น
            </span>

            <div className="min-h-[300px] "></div>

            <div className="flex items-center justify-center w-full">
            <Link
                href="/tests"
                className="border max-w-[252px] w-full py-2.5 rounded-full flex items-center justify-center text-[#7372DF] text-[1.25rem] bg-white font-bold">
                สมัครเลย
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* FAQ Section — visible on page for SEO */}
      <section className=" px-4 sm:px-6 lg:px-8 bg-[#F8F8F8] py-20">
        <div className="max-w-[1360px] mx-auto">
        <div className="mx-auto flex max-[899px]:flex-col max-[899px]:items-start max-[899px]:justify-center">
          <div className="w-[35%] max-[899px]:w-[100%] text-start flex flex-col justify-between">
            <div className="">
              <h2 className="text-[2.5rem] font-bold text-[#4E4E4E] mb-2">
              คำถามที่พบบ่อย
            </h2>
            <p className="text-[#595959] text-[1.25rem]">
            <span className='font-semibold'>เกี่ยวกับ CEFR Ready</span>
            <span className="block max-md:inline font-semibold"> และการสอบ CEFR</span>
          </p>
            </div>
            <div className="">
              <p className='text-[1rem] font-medium text-[#797979]'>หากท่านพบปัญหาการใช้งาน 
               <span className='block '>
                สามารถติดต่อขอความช่วยเหลือได้ที่นี่</span></p>

                <Link href="/demo" className="bg-[#6D88EE] text-[1.25rem] font-semibold mt-4 text-white rounded-full inline-flex items-center gap-2 text-sm md:text-base px-8 py-2 md:px-16 md:py-4">
                ติดต่อเรา
                 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <FaqAccordion />
        </div>
        </div>
      </section>
    </div>
  );
}
