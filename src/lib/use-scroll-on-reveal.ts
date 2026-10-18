'use client';

import { useCallback, useEffect, useRef } from 'react';
import { measureBottomBarInset, scrollIntoViewIfClipped } from './scroll-into-view';

/**
 * ref callback สำหรับผูกกับกล่องคำอธิบาย — เลื่อนหน้าไปหาเฉลยแบบ smooth
 * ทันทีที่เฉลยโผล่ แต่เฉพาะเมื่อมองไม่เห็นครบ
 *
 * ใช้ ref callback ไม่ใช่ effect ที่ดู selectedAnswer เพราะ flow ปัจจุบันคือ
 * เลือก → ตรวจคำตอบ → เฉลย: ตอนเลือกยังไม่มีเฉลยให้โชว์ ส่วนตอนเฉลยโผล่
 * selectedAnswer ไม่เปลี่ยนอีกแล้ว จึงไม่มี dep ตัวไหนเปลี่ยนพร้อมกับ
 * "เฉลยปรากฏ" — effect แบบนั้นตายเงียบมานานใน FocusFormQuestionCard
 * และ ListeningAudioPlayer การ mount ของกล่องคำอธิบายคือสัญญาณตรงตัว
 * และไม่ผูกกับ prop ใด
 *
 * เรื่อง timing — ต้นเหตุที่ทำให้การเลื่อนดูกระตุก: เดิมใช้ setTimeout(100ms)
 * ซึ่งเป็นการเดา ไม่ใช่การรอจริง ถ้า 100ms ไม่พอ (ฟอนต์/ข้อความยังไม่ลง)
 * จะวัดตำแหน่งผิดแล้วหน้าขยับตามทีหลัง = กระโดด ถ้ามากกว่า ผู้เรียน
 * รู้สึกหน่วงก่อนขยับ จึงเปลี่ยนเป็น requestAnimationFrame ซ้อนสองชั้น
 * ชั้นแรกคือหลัง commit ชั้นที่สองคือหลังเบราว์เซอร์ paint เสร็จ
 * ณ ตอนนั้นผังจริงน่าจะนิ่งแล้วจึงวัดตำแหน่งได้ตรง
 */
export function useScrollIntoViewOnReveal() {
  const isMountedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  // กันไม่ให้สั่งซ้ำ: ref callback ถูกเรียกซ้ำได้เมื่อ component re-mount
  // (เช่นสลับข้อ) และคำสั่งซ้ำระหว่างที่ animation กำลังวิ่งจะทำให้หน้ากระตุก
  const scrolledNodeRef = useRef<HTMLElement | null>(null);

  // ข้ามรอบ mount แรก: หน้า review render พร้อมเฉลยมาเลย ต้องไม่กระโดดตอนเปิดหน้า
  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return useCallback((node: HTMLDivElement | null) => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (!node || !isMountedRef.current) return;
    if (scrolledNodeRef.current === node) return; // เฉลยก้อนเดิมเลื่อนไปแล้ว
    scrolledNodeRef.current = node;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        // หักแถบล่างแบบ fixed ออก — ไม่งั้นเฉลยที่อยู่ใต้แถบจะถูกตัดสิน
        // ว่า "เห็นครบ" แล้วไม่เลื่อน ทั้งที่ผู้เรียนมองไม่เห็น
        scrollIntoViewIfClipped(node, window.innerHeight, measureBottomBarInset());
      });
    });
  }, []);
}
