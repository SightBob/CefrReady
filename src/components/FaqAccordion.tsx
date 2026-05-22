'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    question: 'CEFR คืออะไร?',
    answer:
      'CEFR (Common European Framework of Reference for Languages) คือกรอบมาตรฐานสากลในการวัดระดับความสามารถทางภาษาอังกฤษ แบ่งเป็น 6 ระดับ ตั้งแต่ A1 (Beginner) ถึง C2 (Mastery) ปัจจุบันมหาวิทยาลัยไทยหลายแห่ง รวมถึงมหาวิทยาลัยเทคโนโลยีสุรนารี (มทส / SUT) นำมาตรฐาน CEFR ไปใช้วัดระดับภาษาอังกฤษของนักศึกษาก่อนสำเร็จการศึกษา',
  },
  {
    question: 'ข้อสอบ CEFR มีอะไรบ้าง?',
    answer:
      'ข้อสอบ CEFR มาตรฐานสากลมี 4 ประเภทหลัก ได้แก่ (1) Focus on Form — ทดสอบไวยากรณ์ภาษาอังกฤษ เช่น Tense, Preposition, Articles (2) Focus on Meaning — ทดสอบคำศัพท์ เช่น Synonym, Antonym, Context Clues (3) Form & Meaning — เติมคำในบทความ รวมทั้งไวยากรณ์และคำศัพท์ (4) Listening — ฟังบทสนทนาภาษาอังกฤษแล้วตอบคำถาม CEFR Ready ครอบคลุมทุกประเภทครบถ้วน',
  },
  {
    question: 'ต้องได้ CEFR ระดับอะไรถึงจะผ่านข้อกำหนด?',
    answer:
      'ขึ้นอยู่กับมหาวิทยาลัยและสาขาวิชา โดยทั่วไปมักต้องผ่านเกณฑ์ระดับ B1 ขึ้นไปก่อนสำเร็จการศึกษา บางสาขาอาจต้องการ B2 ขึ้นไป ควรตรวจสอบกับมหาวิทยาลัยของคุณโดยตรงเพื่อข้อกำหนดล่าสุด CEFR Ready ช่วยฝึกทุกระดับตั้งแต่ A1 ถึง C2 เพื่อให้มั่นใจก่อนสอบจริง',
  },
  {
    question: 'ใช้ CEFR Ready เตรียมสอบ CEFR ได้จริงไหม?',
    answer:
      'ได้ครับ ข้อสอบใน CEFR Ready ออกแบบตามโครงสร้างข้อสอบ CEFR มาตรฐานสากล ทั้งรูปแบบคำถาม ระดับความยาก และเนื้อหาที่ออกสอบ ครอบคลุมทุกประเภทที่มหาวิทยาลัยไทยใช้จริง มีคำอธิบายเฉลยทุกข้อเป็นภาษาไทย ทำให้เข้าใจได้ง่าย',
  },
  {
    question: 'ใช้ CEFR Ready ฟรีหรือเปล่า?',
    answer:
      'ฟรี 100% ไม่มีค่าใช้จ่ายใดๆ สามารถทำข้อสอบตัวอย่าง (Demo) ทุกประเภทได้ทันทีโดยไม่ต้องสมัครสมาชิก สำหรับข้อสอบเต็ม 30 ข้อและการติดตามพัฒนาการต้องล็อกอินด้วย Google account ซึ่งใช้เวลาไม่กี่วินาที',
  },
  {
    question: 'CEFR มี 6 ระดับอะไรบ้าง?',
    answer:
      'CEFR มี 6 ระดับ ได้แก่: A1 (Beginner — สื่อสารขั้นพื้นฐาน), A2 (Elementary — สื่อสารในชีวิตประจำวัน), B1 (Intermediate — สื่อสารในสถานการณ์ทั่วไปได้), B2 (Upper-Intermediate — สื่อสารกับเจ้าของภาษาได้คล่อง), C1 (Advanced — ใช้ภาษาได้อย่างยืดหยุ่น), C2 (Mastery — ใช้ภาษาได้ระดับเจ้าของภาษา)',
  },
  {
    question: 'สอบ CEFR กี่ครั้งถ้าสอบไม่ผ่าน?',
    answer:
      'ขึ้นอยู่กับมหาวิทยาลัยของคุณ โดยทั่วไปนักศึกษาสามารถสอบ CEFR ได้หลายครั้งจนกว่าจะผ่านเกณฑ์ที่กำหนด ระหว่างรอสอบสามารถฝึกกับ CEFR Ready ฟรีได้ตลอดเวลา ทำซ้ำได้ไม่จำกัดจนกว่าจะมั่นใจ',
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
              isOpen ? 'border-primary-200 shadow-md' : 'border-slate-200 shadow-sm'
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full px-5 py-4 md:px-6 md:py-5 text-left flex items-start justify-between gap-4"
              aria-expanded={isOpen}
            >
              <span
                className={`font-semibold text-sm md:text-base leading-snug transition-colors ${
                  isOpen ? 'text-primary-700' : 'text-slate-800'
                }`}
              >
                {faq.question}
              </span>
              <ChevronDown
                className={`shrink-0 w-5 h-5 mt-0.5 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-primary-500' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <p className="px-5 pb-5 md:px-6 md:pb-6 text-sm md:text-base text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                {faq.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
