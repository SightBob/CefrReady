import Link from 'next/link';
import { BookOpenText, BookOpen, Newspaper, Headphones } from 'lucide-react';

/**
 * Section "ข้อสอบ CEFR มีทั้งหมด 4 พาร์ท" — design Figma node 42:1656 (42:2053-42:2087)
 * การ์ดขาว 4 ใบ: ไอคอนพื้นฟ้า #5A95C6 36px โค้ง 9px + ชื่อทักษะ #524924 18px bold
 * + คำอธิบาย #524924 15px / การ์ดโค้ง 20px
 */
const PARTS = [
  {
    title: 'Focus on Form',
    desc: 'ทดสอบความรู้ของคุณเกี่ยวกับ โครงสร้างไวยากรณ์ รูปแบบคำกริยา และแพทเทิร์นประโยค',
    icon: BookOpenText,
    href: '/tests',
  },
  {
    title: 'Focus on Meaning',
    desc: 'ทดสอบความรู้ของคุณเกี่ยวกับ โครงสร้างไวยากรณ์ รูปแบบคำกริยา และแพทเทิร์นประโยค',
    icon: BookOpen,
    href: '/tests',
  },
  {
    title: 'Form & Meaning',
    desc: 'ทดสอบความรู้ของคุณเกี่ยวกับ โครงสร้างไวยากรณ์ รูปแบบคำกริยา และแพทเทิร์นประโยค',
    icon: Newspaper,
    href: '/tests',
  },
  {
    title: 'Listening',
    desc: 'ทดสอบความรู้ของคุณเกี่ยวกับ โครงสร้างไวยากรณ์ รูปแบบคำกริยา และแพทเทิร์นประโยค',
    icon: Headphones,
    href: '/tests',
  },
];

export default function HomeTestParts() {
  return (
    <section className="px-4 pt-1 bg-[#F7F1DC] pb-[44px] max-w-[1251px] mx-auto rounded-bl-[30px] rounded-br-[30px]" id="test-parts">
      

      <h2 className="mt-[33px] text-center text-[26px] font-bold text-[#524924]">
        ข้อสอบ CEFR มีทั้งหมด 4 พาร์ท
      </h2>

      <div className="mx-auto mt-[34px] grid max-w-[1159px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[29px]">
        {PARTS.map(({ title, desc, icon: Icon, href }) => (
          <Link
            key={title}
            href={href}
            className="flex flex-col gap-[14px] rounded-[20px] bg-white px-[18px] py-[20px]"
          >
            <div className="flex items-center gap-[14px]">
              <div className="flex size-[36px] shrink-0 items-center justify-center rounded-[9px] bg-[#5A95C6]">
                <Icon className="size-[20px] text-white" />
              </div>
              <p className="text-[18px] font-bold text-[#524924]">{title}</p>
            </div>
            <p className="text-[15px] font-medium leading-[normal] text-[#524924]">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
