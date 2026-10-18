'use client';

import { useCallback, useEffect, useRef } from 'react';
import { measureBottomBarInset, scrollIntoViewIfClipped } from './scroll-into-view';

/**
 * ref callback สำหรับผูกกับกล่องคำอธิบาย — เลื่อนเข้ากลางจอแบบ smooth
 * ทันทีที่กล่องนั้นถูก mount (คือตอนเฉลยโผล่หลังกดตรวจคำตอบ) แต่เฉพาะเมื่อ
 * มองไม่เห็นครบ เพราะถ้าเฉลยสั้นและอยู่ในจออยู่แล้ว การเลื่อนจะสะดุด
 *
 * ใช้ ref callback ไม่ใช่ effect ที่ดู selectedAnswer เพราะ flow ปัจจุบันคือ
 * เลือก → ตรวจคำตอบ → เฉลย: ตอนเลือกยังไม่มีเฉลยให้โชว์ ส่วนตอนเฉลยโผล่
 * selectedAnswer ไม่เปลี่ยนอีกแล้ว จึงไม่มี dep ตัวไหนเปลี่ยนพร้อมกับ
 * "เฉลยปรากฏ" — effect แบบนั้นตายเงียบมานานใน FocusFormQuestionCard
 * และ ListeningAudioPlayer การ mount ของกล่องคำอธิบายคือสัญญาณตรงตัว
 * และไม่ผูกกับ prop ใด
 */
export function useScrollIntoViewOnReveal(delayMs = 100) {
  const isMountedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // ข้ามรอบ mount แรก: หน้า review render พร้อมเฉลยมาเลย ต้องไม่กระโดดตอนเปิดหน้า
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (node: HTMLDivElement | null) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!node || !isMountedRef.current) return;
      // หน่วงเล็กน้อยรอให้ React วางเฉลยลง DOM ครบก่อนวัดตำแหน่ง
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        // หักแถบล่างแบบ fixed ออก — ไม่งั้นเฉลยที่อยู่ใต้แถบจะถูกตัดสิน
        // ว่า "เห็นครบ" แล้วไม่เลื่อน ทั้งที่ผู้เรียนมองไม่เห็น
        scrollIntoViewIfClipped(node, window.innerHeight, 'center', measureBottomBarInset());
      }, delayMs);
    },
    [delayMs],
  );
}
