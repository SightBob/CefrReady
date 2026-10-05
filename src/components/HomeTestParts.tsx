import Link from 'next/link';
import Image from 'next/image';

/**
 * Section "ข้อสอบ CEFR ทั้งหมด 4 ทักษะ" — Figma 249:3395 (เดสก์ท็อป) / 249:4518 → 249:4802 (มือถือ)
 * พื้น #F7F1DC มุมล่าง 34px / การ์ดขาว ขอบ #DEEBF6 1.4px เงา 3px 4px มุม 20px
 * padding 21/20 · ชื่อทักษะ #334155 18px semibold · คำอธิบาย #53657F 14px
 * + แถว "30 นาที / 9 เซ็ต" #555 13px + ปุ่มลูกศร #8EBEE6 39×30 · การ์ดกว้าง 265 gap 32
 * ≤767px เลื่อนแนวนอนแบบ snap พร้อมจุดบอกสไลด์ / >767px เรียงกริด 2–4 คอลัมน์
 */
const PARTS = [
  {
    title: 'Focus on Form',
    desc: 'หมวดนี้จะครอบคลุมเนื้อหาการสอบทั้ง 4 หมวดหมู่',
  },
  { title: 'Focus on Meaning', desc: 'เติมคำในช่องว่าง มีทั้งหมด 10 ชุด ให้ลองทำ' },
  { title: 'Form & Meaning', desc: 'ระดับ A2 - B1 เป็นข้อสอบเกี่ยวกับบทสนทนา' },
  { title: 'Listening', desc: 'ระดับ A1 - A2 เนื้อหาจะมาจาก focus on from' },
];

type Part = (typeof PARTS)[number];

function PartCard({ title, desc, className = '' }: Part & { className?: string }) {
  return (
    <Link
      href="/tests"
      className={`flex flex-col gap-[21px] rounded-[20px] border-[1.4px] border-[#DEEBF6] bg-white px-[21px] py-[20px] shadow-[3px_4px_0px_#DEEBF6] ${className}`}
    >
      <p className="text-[18px] font-semibold text-[#334155]">{title}</p>
      <p className="min-h-[51px] text-[14px] font-medium leading-[normal] text-[#53657F]">{desc}</p>
      <div className="flex items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[12px]">
          <span className="flex items-center gap-[4px]">
            <Image src="/home/meta-time.svg" alt="" width={14} height={14} />
            <span className="text-[13px] font-medium text-[#555]">30 นาที</span>
          </span>
          <span className="flex items-center gap-[4px]">
            <Image src="/home/meta-sets.svg" alt="" width={14} height={14} />
            <span className="text-[13px] font-medium text-[#555]">9 เซ็ต</span>
          </span>
        </div>
        <span className="flex h-[30px] w-[39px] shrink-0 items-center justify-center rounded-[12px] bg-[#8EBEE6]">
          <Image src="/home/card-arrow.svg" alt="" width={14} height={14} />
        </span>
      </div>
    </Link>
  );
}

export default function HomeTestParts() {
  return (
    <section className="px-4 max-md:px-0 pt-1 bg-[#F7F1DC] pb-[44px] max-md:pb-[13px] max-w-[1251px] mx-auto md:rounded-bl-[34px] md:rounded-br-[34px] max-md:rounded-bl-0 max-md:rounded-br-0" id="test-parts">
      <h2 className="mt-[33px] max-md:mt-[20px] max-md:px-[17px] text-center text-[26px] max-md:text-[18px] font-bold text-[#524924]">
        ข้อสอบ CEFR ทั้งหมด 4 ทักษะ
      </h2>

      {/* มือถือ: carousel แนวนอนแบบ snap (249:4802) */}
     <div className="mt-[34px] hidden max-md:mt-[4px] max-md:flex max-md:gap-[22px] max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:py-[10px] max-md:pl-[calc((100vw-298px)/2)] max-md:pr-[calc((100vw-298px)/2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  {PARTS.map((part) => (
    <PartCard
      key={part.title}
      {...part}
      className="w-[298px] shrink-0 snap-center"
    />
  ))}
</div>

      {/* จุดบอกสไลด์ (Figma 249:4907) */}
      <div aria-hidden="true" className="mt-[11px] hidden max-md:flex items-center justify-center gap-[5px]">
        <span className="size-[9px] rounded-full bg-[#8EBEE6]" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-[9px] rounded-full bg-white" />
        ))}
      </div>

      {/* แท็บเล็ต/เดสก์ท็อป: การ์ดชุดเดียวกัน เรียงกริด */}
      <div className="mx-auto mt-[34px] max-md:hidden grid max-w-[1156px] grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-[32px]">
        {PARTS.map((part) => (
          <PartCard key={part.title} {...part} />
        ))}
      </div>
    </section>
  );
}