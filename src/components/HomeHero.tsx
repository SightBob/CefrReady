"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

/**
 * Hero — design Figma node 249:3088 (desktop 1536) + 249:4518 (มือถือ)
 * เดสก์ท็อป: บรรทัดนำ 36px เงาขาว 3px/4px · หัวเรื่อง 80px ไม่มีขอบขาว · otter 191×162
 */
export default function HomeHero() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const centerMiddleItem = () => {
      const container = scrollRef.current;
      const middleItem = midRef.current;

      if (!container || !middleItem) return;
      if (window.innerWidth >= 768) return;

      const containerRect = container.getBoundingClientRect();
      const itemRect = middleItem.getBoundingClientRect();

      container.scrollLeft +=
        itemRect.left +
        itemRect.width / 2 -
        (containerRect.left + containerRect.width / 2);
    };

    centerMiddleItem();

    document.fonts?.ready.then(() => {
      centerMiddleItem();
    });

    window.addEventListener('resize', centerMiddleItem);

    return () => {
      window.removeEventListener('resize', centerMiddleItem);
    };
  }, []);

  return (
    <section className="relative overflow-visible bg-[#FFFEFA]">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/bg/bg-main1.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Hero — mobile ≤767px ตาม Figma 249:4518 (249:4667/249:4672) */}
      <div className="relative z-20 flex h-[511px] flex-col items-center px-4 pt-14 pb-0 text-center max-md:h-auto max-md:pb-[110px] max-md:pt-[27px]">
        {/* Figma 249:3267 — 36px + text-shadow 3px/4px ขาว */}
        <p className="text-[36px] font-bold leading-[normal] text-[#556376] [text-shadow:3px_4px_0_#FFF] max-md:hidden">
          การเตรียมสอบจะไม่ใช่เรื่องยากอีกต่อไป...
        </p>

        {/* Figma 249:4669 — บรรทัดนำของเดสก์ท็อปไม่มีบนมือถือ */}
        <p className="hidden w-full text-[18px] font-bold leading-[30px] text-[#556376] [text-shadow:3px_1px_0_#FFF] max-md:block">
          การเตรียมสอบ CEFR จะง่ายขึ้น...
        </p>

        {/* Figma 249:3269 — 80px ไม่มีขอบขาว */}
        <h1 className="mt-1 text-[clamp(38px,9.5vw,64px)] font-bold leading-normal max-md:mt-[-2px] md:text-[80px]">
          <span className="font-['IBM_Plex_Sans_Thai'] text-[#5A95C6]">CEFR</span>

          {' '}

          <span className="font-['IBM_Plex_Sans_Thai'] text-[#FFDB40]">Ready!</span>
        </h1>

        {/* Figma 249:3268 */}
        <p className="mt-2 text-[20px] font-bold text-[#556376] max-md:hidden">
          รวมทุกเนื้อหาข้อสอบ CEFR และแนวทางต่าง ๆ ไว้ให้คุณแล้ว
        </p>

        {/* Figma 249:4671 */}
        <p className="mt-1 hidden w-full px-[10px] text-[14px] font-semibold leading-[23px] text-[#556376] max-md:block">
          รวมทุกเนื้อหาข้อสอบและแนวทางต่าง ๆ ไว้ให้คุณแล้ว
        </p>

        {/* ปุ่ม 2 ปุ่ม — Figma 249:4672 (227×50, ข้อความ 15px) */}
        <div className="mt-8 flex flex-col items-center gap-[19px] max-md:mt-[24px] max-md:gap-[14px] sm:flex-row">
          <Link
            href="/tests"
            className="flex h-[65px] w-[248px] max-w-full items-center justify-center rounded-[14px] border-r-4 border-b-[5px] border-[#FFDB40] bg-[#FFF0AE] px-[11px] py-[10px] text-[18px] font-bold text-[#6D5E1C] max-md:h-[50px] max-md:w-[227px] max-md:border-r-[2px] max-md:border-b-[3px] max-md:text-[15px]"
          >
            เริ่มสอบเลย
          </Link>

          <Link
            href="/demo"
            className="flex h-[65px] w-[243px] max-w-full items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-[20px] py-[12px] text-[18px] font-bold text-[#797253] shadow-[3px_4px_0px_#D5D3D3] max-md:h-[50px] max-md:w-[227px] max-md:text-[15px] max-md:shadow-[2px_3px_0px_#D5D3D3]"
          >
            โหมดตัวอย่าง
          </Link>
        </div>

        {/* Otter */}
        <div className="absolute bottom-[-9px] left-1/2 h-[162px] w-[191px] -translate-x-1/2 max-md:bottom-[-12px] max-md:h-[100px] max-md:w-[116px]">
          <Image
            src="/logo-otter/otter-flag1.png"
            alt=""
            width={167}
            height={159}
            className="block h-full w-full object-contain"
          />
        </div>
      </div>

      {/* Bubble */}
      <div className="relative z-10 flex items-center justify-center bg-[#FFFEFA] py-[0.8125rem] max-md:px-0 max-md:py-[6px]">
        {/* เงาใต้ otter — Figma 249:3212 (124×12 r33) */}
        <div className="absolute left-1/2 top-0 h-[12px] w-[124px] -translate-x-1/2 rounded-[33px] bg-[#FFDB40] max-md:hidden" />

        <div
          ref={scrollRef}
          className="flex flex-wrap items-center justify-center gap-[17px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:w-full max-md:flex-nowrap max-md:justify-start max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory"
        >
          {[
            '💡 ข้อสอบครอบคลุมทุกทักษะ',
            '💡 เนื้อหาอธิบายเข้าใจง่าย',
            '💡 หมดกังวลแม้พื้นฐานน้อย',
          ].map((text, i) => (
            <div
              key={text}
              ref={i === 1 ? midRef : undefined}
              className="flex h-[50px] w-[318px] max-w-full shrink-0 items-center justify-center rounded-[14px] bg-[#FFFEFA] px-[16px] py-[8px] text-[18px] font-semibold text-[#6C5F2D] max-md:h-[38px] max-md:w-max max-md:rounded-none max-md:px-[8px] max-md:text-[13px] max-md:whitespace-nowrap max-md:snap-center"
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}