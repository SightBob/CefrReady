/**
 * จบรอบการทำข้อสอบ → รีเซ็ตประวัติการคุยกับ AI
 *
 * ทำ 2 อย่างพร้อมกัน (ฝั่ง client):
 * 1. **หมุนรหัสรอบ** (attemptKey) → ครั้งหน้าที่ผู้เรียนกลับมาเข้าชุดเดิม
 *    แชท AI เริ่มใหม่ทันที (ไม่เห็นบทสนทนาของรอบก่อน) — ทำงานแม้ไม่มีเน็ต
 * 2. **แจ้งเซิร์ฟเวอร์ให้เก็บถัง** ข้อความทั้งรอบ (archived) → รอบนี้ถือว่าจบแล้ว
 *    ข้อมูลยังอยู่ใน DB เพื่อวิเคราะห์ แต่ไม่ค้างเป็นรอบที่ยังไม่จบ
 *
 * หมายเหตุ: โควตาที่ใช้ไปแล้วไม่คืน (นับจากการเรียกโมเดลจริง) — เหมือนกดปุ่ม reset
 */

import { rotateAttemptKey } from './attempt-key';

/** พาธ API ที่ใช้ปิดรอบบทสนทนา */
const END_ATTEMPT_PATH = '/api/ai-tutor/end';

/**
 * แจ้งเซิร์ฟเวอร์ให้เก็บถังบทสนทนาของรอบนี้
 *
 * ใช้ sendBeacon ก่อน เพราะต้องทำงานได้ตอนปิดแท็บ/รีเฟรช (fetch ธรรมดาจะถูกยกเลิก)
 * ถ้าใช้ไม่ได้ (เบราว์เซอร์เก่า) → fallback เป็น fetch แบบ keepalive
 */
function notifyServerAttemptEnded(attemptKey: string): void {
  const body = JSON.stringify({ attemptKey });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(END_ATTEMPT_PATH, blob)) return;
    }
  } catch {
    // ใช้ fetch ต่อด้านล่าง
  }

  try {
    void fetch(END_ATTEMPT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ส่งไม่สำเร็จก็ปล่อยไป — ฝั่ง client หมุนรหัสรอบอยู่แล้ว (ผู้เรียนยังได้แชทใหม่)
  }
}

/**
 * ปิดรอบการทำข้อสอบ (ทำจบข้อสอบ / ออกจากหน้าข้อสอบ)
 *
 * @param params.storageKey คีย์ sessionStorage ของรหัสรอบ (ดู attemptKeyStorageKey)
 * @param params.attemptKey รหัสรอบที่กำลังใช้อยู่ (null = ยังไม่มี → ข้ามการแจ้งเซิร์ฟเวอร์)
 * @returns รหัสรอบใหม่ (ผู้เรียนควรใช้ค่านี้ต่อจากนี้ไป)
 */
export function endAiTutorAttempt(params: {
  storageKey: string;
  attemptKey: string | null;
}): string {
  // 1) หมุนรหัสรอบก่อน → ครั้งหน้ากลับมาเข้าชุดเดิมได้แชทใหม่ทันที
  const nextKey = rotateAttemptKey(params.storageKey);

  // 2) เก็บถังบทสนทนาของรอบที่จบ (ถ้ามีรหัสรอบ)
  if (params.attemptKey) notifyServerAttemptEnded(params.attemptKey);

  return nextKey;
}
