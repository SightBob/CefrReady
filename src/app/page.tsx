import type { Metadata } from "next";
import HomeHero from "@/components/HomeHero";
import HomeLevels from "@/components/HomeLevels";
import HomeHelp from "@/components/HomeHelp";
import HomeTestParts from "@/components/HomeTestParts";
import FaqAccordion from "@/components/FaqAccordion";

import JsonLd, {
  websiteSchema,
  courseSchema,
  faqSchema,
} from "@/components/JsonLd";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from 'next/image';

export const metadata: Metadata = {
  title: "CEFR Ready — ฝึกภาษาอังกฤษด้วยข้อสอบมาตรฐาน CEFR",
  description:
    "ฝึกข้อสอบ CEFR ฟรี Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 พร้อมเฉลย",
  openGraph: {
    title: "CEFR Ready — ฝึกภาษาอังกฤษด้วยข้อสอบมาตรฐาน CEFR",
    description:
      "ฝึกข้อสอบ CEFR ฟรี Focus on Form, Focus on Meaning, Form & Meaning และ Listening ระดับ A1-C2 พร้อมเฉลย",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "CEFR Ready — แนวข้อสอบ CEFR มาตรฐานสากล",
      },
    ],
  },
};

export default async function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* SEO: Structured Data */}
      <JsonLd data={websiteSchema()} />
      <JsonLd data={courseSchema()} />
      <JsonLd
        data={faqSchema([
          {
            question: "CEFR คืออะไร?",
            answer:
              "CEFR (Common European Framework of Reference for Languages) คือกรอบมาตรฐานสากลในการวัดระดับความสามารถทางภาษา แบ่งเป็น 6 ระดับ ตั้งแต่ A1 (เริ่มต้น) ถึง C2 (เชี่ยวชาญ) ใช้กันทั่วโลกและถูกนำมาใช้ในการวัดระดับภาษาอังกฤษของนักศึกษาในมหาวิทยาลัยไทย เช่น มทส (SUT)",
          },
          {
            question: "ข้อสอบ CEFR Ready มีอะไรบ้าง?",
            answer:
              "มี 4 ประเภท: (1) Focus on Form — ข้อสอบไวยากรณ์ เช่น tense, preposition, verb form (2) Focus on Meaning — ข้อสอบคำศัพท์ เช่น synonym, antonym (3) Form & Meaning — เติมคำในบทความ รวมไวยากรณ์และคำศัพท์ (4) Listening — ฟังบทสนทนาแล้วตอบคำถาม ครอบคลุมระดับ A1-C2",
          },
          {
            question: "ใช้เตรียมสอบ CEFR ได้ไหม?",
            answer:
              "ได้ครับ ข้อสอบออกแบบตามแนวข้อสอบ CEFR มาตรฐานสากล สามารถใช้เตรียมสอบ CEFR ที่มหาวิทยาลัยไทยหลายแห่ง รวมถึง มทส (Suranaree University of Technology / SUT) ได้",
          },
          {
            question: "ใช้ CEFR Ready ฟรีหรือเปล่า?",
            answer:
              "ฟรี 100% ไม่มีค่าใช้จ่ายใดๆ ทั้งสิ้น สามารถทำข้อสอบตัวอย่างได้โดยไม่ต้องสมัครสมาชิก สำหรับข้อสอบเต็มและการติดตามพัฒนาการ ต้องล็อกอินด้วย Google account",
          },
          {
            question: "CEFR Ready ต้องล็อกอินไหม?",
            answer:
              "ไม่จำเป็นสำหรับข้อสอบตัวอย่าง (Demo) 5 ข้อทุกประเภท แต่หากต้องการทำข้อสอบเต็ม 30 ข้อและดูพัฒนาการของตัวเอง ต้องล็อกอินด้วย Google account ซึ่งใช้เวลาไม่กี่วินาที",
          },
          {
            question: "ข้อสอบ CEFR มีกี่ระดับ?",
            answer:
              "CEFR มี 6 ระดับ: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Mastery) CEFR Ready ครอบคลุมทุกระดับตั้งแต่ A1 ถึง C2",
          },
          {
            question: "คะแนนที่ต้องได้เพื่อผ่าน CEFR คือเท่าไร?",
            answer:
              "ขึ้นอยู่กับมหาวิทยาลัยและสาขาวิชา โดยทั่วไปมักต้องผ่านระดับ B1 ขึ้นไป ควรตรวจสอบกับมหาวิทยาลัยของคุณโดยตรงสำหรับข้อกำหนดล่าสุด CEFR Ready ช่วยฝึกทุกระดับเพื่อให้คุณมั่นใจก่อนสอบจริง",
          },
        ])}
      />

      {/* HERO — design Figma 1:9406 */}
      <HomeHero />

      {/* ข้อสอบ CEFR มีทั้งหมด 4 พาร์ท — design Figma 42:1656 */}
      <HomeTestParts />

      {/* เราจะช่วยให้เพื่อนๆสอบผ่านได้อย่างไร? — design Figma 42:1656 */}
      <HomeHelp />

      {/* ระดับคะแนน A1 - C2 — design Figma 42:1657 */}
      <HomeLevels />

      {/* FAQ Section — visible on page for SEO
          การ์ดเทา #F2F2F2 + เส้นประ #E2E8F0 ย้ายมาจาก HomeLevels ตามคำสั่งผู้ใช้ */}
      <section className="px-4 sm:px-6 lg:px-8 bg-[#F8F8F8] py-20 max-md:py-[40px] mt-[70px] max-md:mt-[24px]">
        <div className="max-w-[1251px] mx-auto rounded-t-[30px] bg-[#F2F2F2] px-6 pt-10 pb-14 max-md:px-[14px] max-md:pt-8 max-md:pb-10 border-4 border-dashed border-[#E2E8F0] border-b-0">
          <div className="mx-auto flex max-[899px]:flex-col max-[899px]:items-start max-[899px]:justify-center">
            <div className="w-[35%] max-[899px]:w-[100%] text-start flex flex-col justify-between">
              <div className="">
                <h2 className="text-[2.5rem] max-md:text-[20px] font-bold text-[#557895] mb-2">
                  คำถามที่พบบ่อย
                </h2>
                <p className="text-[#557895] text-[1.25rem] max-md:text-[14px]">
                  <span className="font-semibold">เกี่ยวกับ CEFR Ready</span>
                  <span className="block max-md:inline font-semibold">
                    {" "}
                    และการสอบ CEFR
                  </span>
                </p>
              </div>
              <div className="">
                <p className="text-[1rem] max-md:text-[14px] font-medium text-[#797979]">
                  หากท่านพบปัญหาการใช้งาน
                  <span className="block ">
                    สามารถติดต่อขอความช่วยเหลือได้ที่นี่
                  </span>
                </p>

                <Link
                  href="/demo"
                  className="text-center text-[18px] max-md:text-[15px] font-semibold leading-normal text-[#524924] rounded-[14px] mt-[15px] border border-[#EAEAEA] bg-white shadow-[3px_3px_0_0_#D5D3D3] flex w-[229px] max-md:w-full h-[60px] max-md:h-[44px] items-center justify-center gap-2 px-5 py-3">
                  ติดต่อเรา
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* CTA Section — SEO target section */}
       <section className="relative h-[523px] max-md:h-[306px] overflow-visible bg-[#FFFEFA]">
  {/* Background pattern */}
  <div className="absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
    <Image
      src="/bg/bg-main1.png"
      alt=""
      fill
      priority
      sizes="100vw"
      className="object-cover object-center"
    />
  </div>

  {/* Content — mobile ≤767px ตาม Figma 249:5045-249:5050 */}
  <div className="relative z-10 flex flex-col items-center text-center max-md:px-[16px]">
    <h2 className="mt-[66px] max-md:mt-[31px] text-[44px] max-md:text-[20px] font-bold leading-normal text-[#4C5F79]">
      หยุดจ่ายค่าสมัครสอบหลายครั้ง
    </h2>

    <h2 className="text-[38px] max-md:text-[18px] font-bold leading-normal text-[#4C5F79]">
      แต่กลับไม่เห็นผลลัพธ์ที่จับต้องได้
    </h2>

    <h2 className="mt-[28px] max-md:mt-[16px] text-[24px] max-md:text-[15px] font-bold max-md:font-semibold leading-normal text-[#4C5F79]">
      “ ลองให้ CEFR Ready ช่วยพาคุณสอบผ่านได้อย่างมั่นใจ ”
    </h2>

    <Link
      href="/tests"
      className="mt-[51px] max-md:mt-[30px] flex h-[65px] w-[331px] max-md:h-[50px] max-md:w-[227px] max-md:max-w-full items-center justify-center rounded-[14px] border-b-[5px] max-md:border-b-[3px] border-r-4 max-md:border-r-[2px] border-[#FFDB40] bg-[#FFF0AE] px-[11px] py-[10px] text-[20px] max-md:text-[15px] font-bold text-[#6D5E1C] "
    >
      เริ่มสอบเลย
    </Link>

     <Link
      href="/tests"
      className="text-center
        text-[18px]
        max-md:text-[15px]
        font-semibold
        leading-normal
        text-[#4C5F79]
        underline
        decoration-solid
        decoration-auto
        underline-offset-auto
        mt-[34px]
        max-md:mt-[18px]
        "
    >
      ดูแพ็กเกจ
    </Link>
  </div>
</section>
    </div>
  );
}
