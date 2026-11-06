"use client";

import Image from "next/image";
import { useState } from "react";

import PricingCheckoutModal from "./PricingCheckoutModal";

/**
 * Section "ราคาและสิทธิประโยชน์" — Figma 649:3422 (หัวข้อ) + 649:3423 (Group 129)
 *
 * แถบพื้นหลัง Rectangle 81 (649:3414): gradient #E6F0F8 → ขาว
 *   stop แรกคงที่ถึง 219px แล้วไล่เป็นขาวที่ 996px (ค่าตามไฟล์) จึงใช้ pixel stop ตรง ๆ
 * หัวข้อ 36px bold #4C5F79 · กล่องครอบ Rectangle 121 (649:3424) 1275×411 radius 49
 *   ขอบ #FFF0AE 1px พื้นขาว padding 41/37/40
 * การ์ดราคา Rectangle 122 (649:3426) 273×330 radius 29 พื้น #FFFDF4 ขอบ #FFF0AE
 *   ชิป "ราคา" #FAF5E3 radius 17 px19 20px #6D5B16 ที่ 22/19
 *   95 = 64px bold #524924 top 147 · บาท / เดือน 32px top 226 · ( เฉลี่ยวันละ 3 บาท ) 20px top 277
 * การ์ดสิทธิประโยชน์ 288×154 radius 25 ขอบ #EEECE5 2px พื้นขาว · ดาว 30×30 ที่ 17/14
 *   ข้อความ 20px semibold #524924 กึ่งกลาง เริ่มที่ top 44 · ระยะห่าง 19.5/22 · ห่างการ์ดราคา 25
 * แท่งตกแต่ง Rectangle 123 (649:3421) #8EBEE6 181×19 radius 25 ห่างกล่อง 51px
 */

const BENEFITS: [string, string][] = [
  ["AI ช่วยติว", "ในทุกข้อที่ไม่เข้าใจ"],
  ["คลังข้อสอบฉบับเต็ม", "(ระดับ A1–C2)"],
  ["ทำข้อสอบได้", "แบบไม่จำกัด"],
  ["มีคำอธิบายเฉลย", "อย่างละเอียดในทุกข้อ"],
  ["ติวเตอร์ AI", "(รับพอยท์รายเดือน)"],
  ["รวมคลังไวยากรณ์", "และคำศัพท์ที่ออกสอบ"],
];

export default function HomePricing() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <section
      id="pricing"
      className="bg-[linear-gradient(to_bottom,#E6F0F8_0px,#E6F0F8_219px,#FFFFFF_996px)] px-4 pb-[52px] pt-[36px] max-md:px-[17px] max-md:pb-[24px] max-md:pt-[24px]"
    >
      <h2 className="text-center text-[36px] font-bold leading-[normal] text-[#4C5F79] max-md:text-[20px]">
        ราคาและสิทธิประโยชน์
      </h2>

      {/* กล่องครอบ — Figma 649:3424 (1275×411 radius 49) */}
      <div className="mx-auto mt-[30px] max-w-[1275px] rounded-[49px] border border-[#FFF0AE] bg-white px-[37px] pb-[40px] pt-[41px] max-md:mt-[20px] max-md:rounded-[24px] max-md:px-[16px] max-md:pb-[16px] max-md:pt-[16px] lg:flex lg:gap-[25px]">
        {/* การ์ดราคา — Figma 649:3426 (คลิกเพื่อเปิด modal ชำระเงิน) */}
        <button
          type="button"
          onClick={() => setIsCheckoutOpen(true)}
          aria-haspopup="dialog"
          className="flex flex-col rounded-[29px] border border-[#FFF0AE] bg-[#FFFDF4] px-[22px] pb-[20px] pt-[19px] text-left transition-shadow hover:shadow-[3px_4px_0px_#FFF0AE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EBEE6] max-md:w-full max-md:rounded-[20px] max-md:px-[18px] max-md:pb-[16px] max-md:pt-[14px] lg:h-[330px] lg:w-[273px] lg:shrink-0"
        >
          <span className="flex h-[33px] w-fit items-center justify-center rounded-[17px] bg-[#FAF5E3] px-[19px] text-[20px] font-semibold leading-[normal] text-[#6D5B16] max-md:h-[24px] max-md:px-[14px] max-md:text-[15px]">
            ราคา
          </span>

          <div className="pl-[6px] text-[#524924] max-md:pl-0">
            <p className="mt-[95px] text-[64px] font-bold leading-none max-md:mt-[18px] max-md:text-[44px]">
              95
            </p>
            <p className="mt-[15px] text-[32px] font-semibold leading-none text-[#6D5B16] max-md:mt-[8px] max-md:text-[22px]">
              บาท / เดือน
            </p>
            <p className="mt-[19px] text-[20px] font-semibold leading-none text-[#6D5B16] max-md:mt-[10px] max-md:text-[14px]">
              ( เฉลี่ยวันละ 3 บาท )
            </p>
          </div>
        </button>

        {/* การ์ดสิทธิประโยชน์ 6 ใบ — Figma 649:3434-649:3443 */}
        <div className="grid grid-cols-1 gap-x-[19.5px] gap-y-[22px] max-md:mt-[16px] max-md:gap-x-[12px] max-md:gap-y-[12px] sm:grid-cols-2 md:grid-cols-3 lg:mt-0 lg:flex-1 lg:grid-cols-3">
          {BENEFITS.map(([line1, line2]) => (
            <div
              key={line1}
              className="relative flex h-[154px] items-start justify-center rounded-[25px] border-2 border-[#EEECE5] bg-white px-[12px] pt-[44px] text-center max-md:min-h-[110px] max-md:h-auto max-md:rounded-[18px] max-md:pt-[34px]"
            >
              <Image
                src="/home/pricing-star.svg"
                alt=""
                width={30}
                height={30}
                className="absolute left-[17px] top-[14px] size-[30px] max-md:left-[12px] max-md:top-[10px] max-md:size-[24px]"
              />
              <p className="text-[20px] font-semibold leading-[33px] text-[#524924] max-md:text-[14px] max-md:leading-[24px]">
                {line1}
                <br />
                {line2}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* แท่งตกแต่ง — Figma 649:3421 */}
      <div
        aria-hidden="true"
        className="mx-auto mt-[51px] h-[19px] w-[181px] rounded-[25px] bg-[#8EBEE6] max-md:mt-[24px] max-md:h-[12px] max-md:w-[120px]"
      />

      <PricingCheckoutModal
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </section>
  );
}
