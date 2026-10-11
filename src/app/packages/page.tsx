import type { Metadata } from 'next';
import Image from 'next/image';

const DESCRIPTION =
  'เนื่องจาก CEFR Ready กำลังพัฒนาข้อสอบให้แม่นยำขึ้น เราจึงขอเริ่มเก็บค่าบริการตั้งแต่วันที่ 1 พฤษจิกายน 2569 เป็นต้นไป เพื่อนๆสามารถใช้งานได้ฟรี จนกว่าจะถึงกำหนดสิ้นสุดครับ';

export const metadata: Metadata = {
  title: 'ราคา',
  description: DESCRIPTION,
  alternates: { canonical: 'https://cefr-ready.site/packages' },
  openGraph: {
    title: 'ราคา | CEFR Ready',
    description: DESCRIPTION,
    url: 'https://cefr-ready.site/packages',
  },
};

/** สีน้ำเงินที่ Figma ใช้เฉพาะข้อความเน้น (504:622) — ต่างจาก #5A95C6 ของทั่วไปในเว็บ */
const ACCENT = '#6DA8D9';

export default function PackagesPage() {
  return (
    // ChromeShell วาง <main class="bg-white"> ไว้ให้ หน้านี้ต้องเป็นพื้นครีมตาม Figma 504:581
    <div className="min-h-[calc(100vh-64px)] min-[992px]:min-h-[calc(100vh-88px)] bg-[#fffef9]">
      {/* ระยะบน 81px = ระยะจากขอบล่าง header (88px) ถึงจุดเริ่ม notice ใน Figma (169px) */}
      <section className="flex flex-col items-center px-5 pt-12 min-[992px]:pt-[81px]">
        <div className="flex w-full max-w-[737px] flex-col items-center gap-[51px]">
          <div className="flex w-full flex-col items-center">
            {/* 504:616 — นากอตเตอร์ถือป้าย 232×232 (ขนาด/ตำแหน่งตาม Figma) */}
            <div className="relative h-[150px] w-[150px] min-[992px]:h-[232px] min-[992px]:w-[232px]">
              <Image
                src="/packages/otter-notice.png"
                alt="นากอตเตอร์ถือป้ายแจ้งให้ทราบ"
                width={232}
                height={232}
                priority
                className="h-full w-full rounded-[10px] object-cover"
              />
              {/* ป้ายสีขาวหลังรูป (504:620) */}
              <span className="absolute left-1/2 top-[97.5px] h-[12.6px] w-[94.4px] -translate-x-1/2 rounded-[59px] bg-white min-[992px]:top-[150.76px] min-[992px]:h-[19.53px] min-[992px]:w-[146.07px]" />
              {/* ข้อความบนป้าย (504:621) */}
              <span className="absolute left-1/2 top-[97.5px] -translate-x-1/2 whitespace-nowrap font-itim text-[15.5px] leading-none text-[#6d5b16] min-[992px]:top-[150.76px] min-[992px]:text-[24px]">
                แจ้งให้ทราบ
              </span>
            </div>

            {/* 504:622 — ข้อความประกาศ. Figma ให้กล่องสูง 87px (3 บรรทัด × 29px) จึงล็อก leading เป็น 29px */}
            <p className="mt-4 w-full text-center font-itim text-[17px] leading-[1.6] text-[#6d5b16] min-[992px]:mt-0 min-[992px]:text-[24px] min-[992px]:leading-[29px]">
              เนื่องจาก CEFR Ready กำลังพัฒนาข้อสอบให้แม่นยำขึ้น เราจึงขอเริ่มเก็บค่าบริการตั้งแต่วันที่{' '}
              <span style={{ color: ACCENT }}>1 พฤษจิกายน 2569</span> เป็นต้นไป เพื่อนๆสามารถใช้งานได้{' '}
              <span style={{ color: ACCENT }}>“ ฟรี ”</span> จนกว่าจะถึงกำหนดสิ้นสุดครับ
            </p>
          </div>

          {/* 504:623 — เส้นคั่นลายเส้นโค้ง */}
          <Image
            src="/packages/divider.svg"
            alt=""
            width={699}
            height={9}
            className="h-auto w-full max-w-[699px]"
          />
        </div>
      </section>
    </div>
  );
}