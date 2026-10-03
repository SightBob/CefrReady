import Image from 'next/image';
import Link from 'next/link';

/**
 * Hero — design Figma node 1:9406 (landing page ใหม่)
 */
export default function HomeHero() {
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

      {/* Hero */}
      <div className="relative z-20 flex h-[511px] flex-col items-center px-4 pt-14 pb-0 text-center">
        <p className="text-[#556376] text-xl sm:text-2xl md:text-[32px] font-bold leading-snug">
          การสอบจะไม่ใช่เรื่องยากอีกต่อไป
        </p>

      <h1 className="mt-1 text-[56px] font-bold leading-normal sm:text-[64px] md:text-[80px]">
  <span
    className="relative inline-block font-['IBM_Plex_Sans_Thai'] text-[#5A95C6]"
  >
    <span
      aria-hidden="true"
      className="absolute inset-0 text-transparent [-webkit-text-stroke:11px_#FFF]"
    >
      CEFR
    </span>
    <span className="relative">CEFR</span>
  </span>

  {' '}

  <span
    className="relative inline-block font-['IBM_Plex_Sans_Thai'] text-[#FFDB40]"
  >
    <span
      aria-hidden="true"
      className="absolute inset-0 text-transparent [-webkit-text-stroke:11px_#FFF]"
    >
      Ready!
    </span>
    <span className="relative">Ready!</span>
  </span>
</h1>

        <p className="mt-2 text-[#556376] text-lg sm:text-xl md:text-[26px] font-semibold">
          พื้นที่เตรียมสอบครบจบทุกทักษะ
        </p>

        {/* ปุ่ม 2 ปุ่ม */}
        <div className="mt-8 flex flex-col items-center gap-[19px] sm:flex-row">
          <Link
            href="/tests"
            className="flex h-[65px] w-[248px] max-w-full items-center justify-center rounded-[14px] border-b-[5px] border-r-4 border-[#FFDB40] bg-[#FFF0AE] px-[11px] py-[10px] text-[18px] font-bold text-[#6D5E1C]"
          >
            เริ่มสอบเลย
          </Link>

          <Link
            href="/demo"
            className="flex h-[65px] w-[243px] max-w-full items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white px-[20px] py-[12px] text-[18px] font-bold text-[#797253] shadow-[3px_4px_0px_#D5D3D3]"
          >
            โหมดตัวอย่าง
          </Link>
        </div>

        {/* Otter */}
        <div className="absolute bottom-[-20px] left-1/2 h-[159.03px] w-[187.19px] -translate-x-1/2">
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
      <div className="relative z-10 bg-[#FFFEFA] px-4 flex items-center  py-[0.8125rem] justify-center border">
        <div className="w-[104.363px] h-[18.222px] rounded-full bg-[#FFDB40] absolute left-1/2 translate-x-[-50%] top-[-5px]"></div>
        <div className="flex flex-wrap items-center justify-center gap-[17px]">
          {[
            '💡 ข้อสอบครอบคลุมทุกทักษะ',
            '💡 เนื้อหาอธิบายเข้าใจง่าย',
            '💡 หมดกังวลแม้พื้นฐานน้อย',
          ].map((text) => (
            <div
              key={text}
              className="flex h-[50px] w-[318px] max-w-full items-center justify-center rounded-[14px] bg-[#FFFEFA] px-[16px] py-[8px] text-[18px] font-semibold text-[#6C5F2D]"
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}