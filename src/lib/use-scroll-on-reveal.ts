'use client';

import { useEffect, useRef } from 'react';
import { measureBottomBarInset, scrollIntoViewIfClipped } from './scroll-into-view';

/**
 * เลื่อนหน้าไปหาเฉลยแบบ smooth ทันทีที่เฉลยปรากฏ แต่เฉพาะเมื่อมองไม่เห็นครบ
 *
 * ใช้ useEffect ที่ผูกกับ showExplanation ไม่ใช่ ref callback ของกล่องเฉลย
 * เพราะ ref callback ถูก StrictMode เรียกสองครั้ง (attach → detach → attach)
 * เมื่อกล่องเฉลยโผล่: การเรียกครั้งแรกจองงานไว้ การเรียกครั้งที่สองมา detach
 * จึงยกเลิกงานที่จองไว้ แล้วธงกันการเลื่อนซ้ำก็บล็อกการ attach ครั้งที่สาม
 * ผลคือไม่เลื่อนเลยแม้เฉลยขึ้นจริง — เทสต์ที่พิสูจน์อยู่ใน
 * FocusFormQuestionCard.scroll.test.tsx
 *
 * effect ผูกกับค่า showExplanation จึงยิงตรงกับ "เฉลยปรากฏ" และไม่ต้องพึ่ง
 * จังหวะ mount/detach ของ ref เลย StrictMode เรียก effect ซ้ำได้เฉพาะตอน
 * mount ซึ่งตอนนั้น showExplanation ยังเป็น false (ยังไม่ได้กดตรวจคำตอบ)
 * จึงไม่มีอะไรให้เลื่อนและไม่กระทบ
 *
 * เรื่อง timing — ต้นเหตุที่ทำให้การเลื่อนดูกระตุก: เดิมใช้ setTimeout(100ms)
 * ซึ่งเป็นการเดา ไม่ใช่การรอจริง ถ้า 100ms ไม่พอ (ฟอนต์/ข้อความยังไม่ลง)
 * จะวัดตำแหน่งผิดแล้วหน้าขยับตามทีหลัง = กระโดด จึงเปลี่ยนเป็น
 * requestAnimationFrame ซ้อนสองชั้น ชั้นแรกคือหลัง commit
 * ชั้นที่สองคือหลังเบราว์เซอร์ paint เสร็จ ณ ตอนนั้นผังจริงน่าจะนิ่งแล้ว
 *
 * @returns ref ที่ต้องผูกกับกล่องคำอธิบาย
 */
export function useScrollIntoViewOnReveal(showExplanation: boolean) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  // เริ่มต้นเป็นค่าปัจจุบัน = ข้ามการเลื่อนตอน mount (หน้า review เรนเดอร์
  // พร้อมเฉลยมาเลย ต้องไม่กระโดดตอนเปิดหน้า)
  const wasShownRef = useRef(showExplanation);

  useEffect(() => {
    const wasHidden = !wasShownRef.current;
    wasShownRef.current = showExplanation;
    if (!wasHidden || !showExplanation) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        // หักแถบล่างแบบ fixed ออก — ไม่งั้นเฉลยที่อยู่ใต้แถบจะถูกตัดสิน
        // ว่า "เห็นครบ" แล้วไม่เลื่อน ทั้งที่ผู้เรียนมองไม่เห็น
        scrollIntoViewIfClipped(nodeRef.current, window.innerHeight, measureBottomBarInset());
      });
    });

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [showExplanation]);

  return nodeRef;
}
