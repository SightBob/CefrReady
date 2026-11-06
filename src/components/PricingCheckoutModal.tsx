"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Modal "ทำการซื้อให้เสร็จสมบูรณ์" — Figma 649:3484 (การ์ด) บน overlay 649:3483
 *
 * ค่าจาก Figma (630… การ์ด 550×635 radius 30 พื้นขาว กึ่งกลางจอ)
 *  - หัวข้อ 20px semibold #555 ที่ระยะ 26/18 · ปุ่มปิด 24×24 (#3C3C3C) มุมขวาบน 26/21
 *  - เส้นคั่น #EEEEEE ที่ระยะ 65 จากขอบบน
 *  - การ์ดราคา 276×126 พื้น #FDFDFD ขอบ #D8D7D4 radius 19 · ชิป "ราคา" #555 13px
 *    95 = 32px bold #524924 · บาท / เดือน 16px · ( เฉลี่ยวันละ 3 บาท ) 14px (#6D5B16)
 *  - คอลัมน์ขวาจัดชิดขวา: การเรียกเก็บเงิน / รายเดือน 18px #555 · 95 บาท / เดือน 18px #6D5B16 ·
 *    เริ่ม 1 พฤศจิกายน 2569 14px #555
 *  - แผง QR 493×302 พื้น #E8E8E8 radius 17 · หัวข้อ 18px bold · QR 204×204 radius 7 · ชื่อบัญชี 15px
 *  - ปุ่ม 489×49 radius 14 พื้น #FFF0AE ขอบล่าง 5/ขวา 4 #FFDB40 ข้อความ 18px semibold #6D5E1C
 *
 * asset: public/home/payment-qr.png + modal-close.svg (ดาวน์โหลดจาก Figma MCP)
 */
const QR_SRC = "/home/payment-qr.png";
const CLOSE_SRC = "/home/modal-close.svg";

export type PricingCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function PricingCheckoutModal({
  open,
  onClose,
}: PricingCheckoutModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // ล็อกการเลื่อนพื้นหลัง + ปิดด้วย Esc + คืน focus ให้ผู้ใช้เมื่อปิด
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-4">
      {/* Figma 649:3483 — overlay rgba(0,0,0,0.46) */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.46)]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Figma 649:3484 — การ์ด 550×635 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-checkout-title"
        className="relative z-10 max-h-[calc(100dvh-32px)] w-[550px] max-w-full overflow-y-auto rounded-[30px] bg-white px-[26px] pb-[32px] pt-[18px] max-md:rounded-[24px] max-md:px-[16px] max-md:pb-[20px] max-md:pt-[16px]"
      >
        <h2
          id="pricing-checkout-title"
          className="pr-[40px] text-[20px] font-semibold leading-[normal] text-[#555] max-md:text-[16px]"
        >
          ทำการซื้อให้เสร็จสมบูรณ์
        </h2>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่างชำระเงิน"
          className="absolute right-[26px] top-[21px] size-[24px] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EBEE6] max-md:right-[14px] max-md:top-[14px]"
        >
          <Image src={CLOSE_SRC} alt="" width={24} height={24} className="size-[24px]" />
        </button>

        {/* เส้นคั่น — Figma 649:3500 (#EEEEEE) */}
        <div className="mt-[14px] h-px w-full bg-[#EEEEEE]" />

        {/* แถวสรุป: การ์ดราคา + การเรียกเก็บเงิน — Figma 649:3488 / 649:3495 */}
        <div className="mt-[22px] flex items-start justify-between gap-[16px] max-md:flex-col max-md:items-stretch max-md:gap-[12px]">
          <div className="relative h-[126px] w-[276px] shrink-0 rounded-[19px] border border-[#D8D7D4] bg-[#FDFDFD] max-md:w-full">
            <span className="absolute left-[12px] top-[12px] flex h-[21px] items-center justify-center rounded-[17px] bg-[#555] px-[19px] text-[13px] font-semibold leading-[normal] text-white">
              ราคา
            </span>
            <p className="absolute left-[15px] top-[43px] text-[32px] font-bold leading-[normal] text-[#524924]">
              95
            </p>
            <p className="absolute left-[62px] top-[63px] text-[16px] font-semibold leading-[normal] text-[#6D5B16]">
              บาท / เดือน
            </p>
            <p className="absolute left-[18px] top-[88px] text-[14px] font-semibold leading-[normal] text-[#6D5B16]">
              ( เฉลี่ยวันละ 3 บาท )
            </p>
          </div>

          <div className="mt-[8px] text-right max-md:mt-0 max-md:text-left">
            <p className="text-[18px] font-semibold leading-[19px] text-[#555] max-md:text-[15px]">
              การเรียกเก็บเงิน
            </p>
            <p className="text-[18px] font-semibold leading-[19px] text-[#555] max-md:text-[15px]">
              รายเดือน
            </p>
            <p className="mt-[14px] text-[18px] font-semibold leading-[19px] text-[#6D5B16] max-md:mt-[10px] max-md:text-[15px]">
              95 บาท / เดือน
            </p>
            <p className="mt-[16px] text-[14px] font-semibold leading-[19px] text-[#555] max-md:mt-[8px] max-md:text-[12px]">
              เริ่ม 1 พฤศจิกายน 2569
            </p>
          </div>
        </div>

        {/* แผง QR — Figma 649:3503 */}
        <div className="mt-[20px] flex flex-col items-center rounded-[17px] bg-[#E8E8E8] px-[16px] pb-[14px] pt-[14px]">
          <p className="text-[18px] font-bold leading-[normal] text-[#555] max-md:text-[15px]">
            ชำระเงินผ่าน QR Payment
          </p>
          <Image
            src={QR_SRC}
            alt="คิวอาร์โค้ดสำหรับชำระเงิน CEFR Ready"
            width={204}
            height={204}
            className="mt-[5px] size-[204px] rounded-[7px] max-md:mt-[12px] max-md:size-[168px]"
          />
          <p className="mt-[10px] text-center text-[15px] font-semibold leading-[normal] text-[#555] max-md:mt-[10px] max-md:text-[12px]">
            ชื่อบัญชี: CEFR READY ENGLISH TEST
          </p>
        </div>

        {/* ปุ่มยืนยัน — Figma 649:3501 */}
        <button
          type="button"
          onClick={() =>
            toast("ยังไม่เปิดรับชำระเงินอัตโนมัติในขณะนี้", {
              description: "โอนผ่าน QR แล้วแนบสลิปให้ทีมงานตรวจสอบได้เลย",
            })
          }
          className="mt-[18px] flex h-[49px] w-full items-center justify-center rounded-[14px] border-b-[5px] border-r-4 border-[#FFDB40] bg-[#FFF0AE] px-[11px] py-[10px] text-[18px] font-semibold text-[#6D5E1C] transition-colors hover:bg-[#FFEA8F] max-md:h-[44px] max-md:text-[15px]"
        >
          ตรวจสอบการชำระเงิน
        </button>
      </div>
    </div>
  );
}
