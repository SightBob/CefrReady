'use client';

/**
 * ปิดใช้งานชั่วคราว — โปรเจกต์นี้ไม่มี `./PromoModalProvider` (component ตัวจริงของ
 * ป๊อปอัปโปรโมชันไม่ได้อยู่ใน repo) ทำให้ import แบบไดนามิกด้านล่างพังตอน build
 * ตอนนี้ไม่มีที่ไหนเรนเดอร์ component นี้อยู่แล้ว จึงปิดการโหลดไว้ก่อน
 *
 * ถ้าจะเปิดใช้ใหม่: เพิ่มไฟล์ `src/components/PromoModalProvider.tsx` แล้วค่อยดึง
 * การโหลดแบบ defer กลับมา (โหลดเมื่อเบราว์เซอร์ว่างด้วย requestIdleCallback
 * timeout 2500ms หรือหน่วง setTimeout 1000ms) แล้วเรนเดอร์ component ที่โหลดได้
 */
const BLOCKED_PREFIXES = ['/tests', '/demo', '/checkout'];

export function shouldLoadPromoModal(pathname: string): boolean {
  return !BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** ปิดไว้ก่อน: ยังไม่มี PromoModalProvider ให้โหลด จึงไม่เรนเดอร์อะไรเลย */
export default function DeferredPromoModal() {
  return null;
}
