import Link from 'next/link';

/**
 * Footer — design Figma 249:3228 (พื้น #FFFEF9) + 249:3229 (เนื้อหา 1250×266)
 * หัวคอลัมน์ 17px bold #3E3E3E (ไม่ uppercase) · รายการ 16px #808080 · เส้นคั่น · © 15px #9B9B9B
 * ช่องว่างระหว่างคอลัมน์ 170px · คอลัมน์นโยบาย gap 5px คอลัมน์อื่น gap 11px
 */

const BRAND_DESC = ['ฝึกทักษะภาษาอังกฤษตามมาตรฐาน CEFR', 'ครอบคลุมระดับ A1 ถึง C2'];

// Figma 249:3246-249:3249 — คอลัมน์ "เมนูหลัก" ในดีไซน์ซ้ำกับคอลัมน์ "ประเภทข้อสอบ"
// จึงแยกหน้าที่ให้ชัด: คอลัมน์นี้คงลิงก์จริงของเว็บไซต์ ส่วนคอลัมน์ถัดไปเป็นรายการชนิดข้อสอบ
const PRIMARY_LINKS = [
  { href: '/tests', label: 'ข้อสอบ' },
  { href: '/progress', label: 'พัฒนาการ' },
  { href: '/must-know', label: 'Must Know' },
  { href: '/guide', label: 'CEFR Guide' },
  { href: '/contact', label: 'ติดต่อเรา' },
  { href: '/support', label: 'เลี้ยงค่ากาแฟ' },
];

const EXAM_TYPES = [
  { href: '/tests', label: 'Focus on Form' },
  { href: '/tests', label: 'Focus on Meaning' },
  { href: '/tests', label: 'Form & Meaning' },
  { href: '/tests', label: 'Listening' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'เงื่อนไขการให้บริการ' },
  { href: '/privacy', label: 'ความเป็นส่วนตัว' },
  { href: '/refund', label: 'การคืนเงิน' },
];

function FooterLogo() {
  return (
    <span className="flex flex-col items-start">
      <span className="font-['Momo_Trust_Display'] text-[26px] leading-[34px] tracking-[0.52px] text-[#5A95C6] [text-shadow:1px_1px_0_#F8E9A9]">
        CEFR
      </span>
      <span className="-mt-[3px] flex h-[23px] w-[78px] items-center justify-center rounded-[4px] bg-[#FFF0AE] font-caveat text-[15px] font-bold tracking-[0.24px] text-[#524924]">
        READY!
      </span>
    </span>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#EAEAEA] bg-[#FFFEF9]">
      <div className="mx-auto max-w-[1250px] px-4 py-[57px] sm:px-6 lg:px-0">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[183px_132px_132px_134px] lg:justify-between">
          {/* Brand — Figma 249:3232 */}
          <div className="flex flex-col gap-[10px]">
            <Link href="/" aria-label="CEFR Ready หน้าหลัก">
              <FooterLogo />
            </Link>
            <p className="text-[16px] font-medium leading-normal text-[#808080]">
              {BRAND_DESC.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>

          {/* เมนูหลัก — Figma 249:3244 */}
          <nav aria-labelledby="footer-primary">
            <h2
              id="footer-primary"
              className="mb-[11px] text-[17px] font-bold text-[#3E3E3E]"
            >
              เมนูหลัก
            </h2>
            <ul className="space-y-[11px]">
              {PRIMARY_LINKS.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="inline-block py-[10px] text-[16px] font-medium text-[#808080] transition-colors hover:text-[#111] md:py-0"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ประเภทข้อสอบ — Figma 249:3250 */}
          <nav aria-labelledby="footer-exams">
            <h2
              id="footer-exams"
              className="mb-[11px] text-[17px] font-bold text-[#3E3E3E]"
            >
              ประเภทข้อสอบ
            </h2>
            <ul className="space-y-[11px]">
              {EXAM_TYPES.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="inline-block py-[10px] text-[16px] font-medium text-[#808080] transition-colors hover:text-[#111] md:py-0"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* นโยบาย — Figma 249:3256 */}
          <nav aria-labelledby="footer-legal">
            <h2
              id="footer-legal"
              className="mb-[5px] text-[17px] font-bold text-[#3E3E3E]"
            >
              นโยบาย
            </h2>
            <ul className="space-y-[5px]">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="inline-block py-[12px] text-[16px] font-medium text-[#808080] transition-colors hover:text-[#111] md:py-0"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* เส้นคั่น — Figma 249:3261 */}
        <div className="mt-[36px] h-px w-full bg-[#E2E8F0]" />

        {/* © — Figma 249:3262-249:3266 */}
        <div className="mt-[28px] flex flex-wrap items-center gap-[7px]">
          <span aria-hidden="true" className="flex items-end gap-[2px]">
            <span className="size-[14px] rounded-full bg-[#5A95C6]" />
            <span className="text-[16px] font-medium leading-none text-[#9B9B9B]">
              c
            </span>
          </span>
          <p className="text-[15px] font-medium text-[#9B9B9B]">
            {year} CEFR Ready. สงวนลิขสิทธิ์.
          </p>
        </div>
      </div>
    </footer>
  );
}