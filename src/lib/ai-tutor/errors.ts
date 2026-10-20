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

/**
 * ข้อความสำหรับผู้ดูแลระบบ — ตารางของ AI Tutor ยังไม่มี (migration 0045–0048 ยังไม่รัน)
 * ใช้แทน HTTP 500 เพื่อให้รู้ว่าต้องรัน migration (ไม่ใช่บั๊กของโค้ด)
 */
export const AI_TUTOR_MIGRATION_MISSING_MESSAGE =
  'ยังไม่ได้รัน migration ของ AI Tutor (0045–0048) — กรุณาให้ผู้ดูแลระบบรัน migration บนฐานข้อมูลนี้ก่อน';

export type ErrorSummary = {
  message: string;
  code: string | null;
};

/** ข้อความ 429 ฝั่งผู้เรียน (ภาษาไทย) — แยกตามเส้นทางที่ถูกจำกัด */
export const AI_TUTOR_CHAT_RATE_LIMIT_MESSAGE =
  'ถาม AI ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
export const AI_TUTOR_FEEDBACK_RATE_LIMIT_MESSAGE =
  'กดความเห็นถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
export const AI_TUTOR_RESET_RATE_LIMIT_MESSAGE =
  'เริ่มคำถามใหม่ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';

/**
 * คงสถานะ 429 + Retry-After จากระบบ rate limit เดิม แต่เปลี่ยนข้อความเป็นภาษาไทย
 */
export function localizedRateLimitError(res: Response, message: string): Response {
  return Response.json(
    { success: false, error: message },
    {
      status: 429,
      headers: { 'Retry-After': res.headers.get('Retry-After') ?? '60' },
    },
  );
}

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
