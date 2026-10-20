/**
 * ตัวช่วยกลางของ AI Tutor — ข้อความ error ที่ผู้เรียนเข้าใจ + การ log ที่ไม่หลุดข้อมูลลับ
 *
 * หลักการ:
 * - log เฉพาะ message + code (ไม่ log error object ทั้งก้อน เพราะอาจมี stack/DSN/ค่าใน query)
 * - ตัดท้ายด้วย pattern ที่ดูเหมือน connection string ออกทิ้งเสมอ
 * - ข้อความที่ส่งให้ผู้เรียนต้องบอกวิธีแก้ ไม่ใช่ dump ข้อผิดพลาดของเซิร์ฟเวอร์
 */

/** ข้อความสหรับผู้เรียนเมื่อฝั่งเซิร์ฟเวอร์/ฐานข้อมูลใช้งานไม่ได้ชั่วคราว */
export const AI_TUTOR_UNAVAILABLE_MESSAGE =
  'ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง';

/** ข้อความสำหรับผู้เรียนที่ไม่มีสิทธิ์ใช้งาน */
export const AI_TUTOR_NO_ACCESS_MESSAGE = 'คุณยังไม่มีสิทธิ์ใช้งาน AI Tutor';

export type ErrorSummary = {
  message: string;
  code: string | null;
};

/** ตัดรูปแบบที่ดูเหมือน connection string (มี user:pass@host) ออกจากข้อความ */
function redactConnectionString(message: string): string {
  return message.replace(/[a-z0-9+.-]*:\/\/[^\s/@]+@/gi, (match) => {
    const scheme = match.slice(0, match.indexOf('://') + 3);
    return `${scheme}***@`;
  });
}

/**
 * สรุป error เป็นข้อความสั้น ๆ ที่ปลอดภัยพอจะ log
 * - message: ข้อความของ error (ตัด connection string + จำกัดความยาว)
 * - code: รหัสของ error ถ้ามี (เช่น '42P01' = relation does not exist, '42703' = column does not exist)
 */
export function describeError(error: unknown): ErrorSummary {
  let message = 'unknown error';
  let code: string | null = null;

  if (error instanceof Error) {
    message = error.message || error.name;
    const rawCode = (error as { code?: unknown }).code;
    if (typeof rawCode === 'string' && rawCode.length > 0) code = rawCode;
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    message: redactConnectionString(message).slice(0, 300),
    code,
  };
}

/** log แบบเดียวทั้งโปรเจกต์ — แสดงเฉพาะ message/code ไม่ใช่ error ทั้งก้อน */
export function warnWithSummary(scope: string, error: unknown): void {
  const summary = describeError(error);
  console.warn(`[${scope}] ${summary.message}${summary.code ? ` (code ${summary.code})` : ''}`);
}
