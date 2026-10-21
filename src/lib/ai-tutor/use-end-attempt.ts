'use client';

import { useEffect, useRef } from 'react';

import { attemptKeyStorageKey } from './attempt-key';
import { endAiTutorAttempt } from './end-attempt';

/**
 * ปิดรอบ AI Tutor เมื่อ "ทำจบ" หรือ "ออกจากการทำข้อสอบ" → รีเซ็ตประวัติการคุยกับ AI
 *
 * - ออกจากหน้า (กด ✕ / ออกจากข้อสอบ / เปลี่ยนชุด) → หมุนรหัสรอบ + เก็บถังบทสนทนาของรอบนี้
 *   → ครั้งหน้าที่กลับมาเข้าชุดเดิม แชท AI เริ่มใหม่ (ไม่เห็นบทสนทนาของรอบก่อน)
 * - รีเฟรชหน้า (F5) → effect ไม่ถูกเรียก cleanup → ยังเห็นบทสนทนาเดิมของรอบเดิม
 *   (ตั้งใจ ไม่ให้ผู้เรียนเสียบทสนทนาเพียงเพราะกดรีเฟรชผิดพลาด)
 *
 * @param params.sectionId หมวดข้อสอบ
 * @param params.setId ชุดข้อสอบ
 * @param params.attemptKey รหัสรอบที่กำลังใช้อยู่ (null = ยังไม่มี → ข้ามการแจ้งเซิร์ฟเวอร์)
 */
export function useEndAiTutorAttempt(params: {
  sectionId: string;
  setId: string | number;
  attemptKey: string | null;
}): void {
  // เก็บรหัสรอบล่าสุดไว้ใน ref — cleanup ของ effect ไม่ควรใช้ค่าจาก state
  // เพราะจะเป็นค่าเก่า (effect นี้ไม่ได้ depend กับ attemptKey)
  const attemptKeyRef = useRef<string | null>(params.attemptKey);
  useEffect(() => {
    attemptKeyRef.current = params.attemptKey;
  }, [params.attemptKey]);

  useEffect(() => {
    return () => {
      endAiTutorAttempt({
        storageKey: attemptKeyStorageKey(params.sectionId, params.setId),
        attemptKey: attemptKeyRef.current,
      });
    };
  }, [params.sectionId, params.setId]);
}
