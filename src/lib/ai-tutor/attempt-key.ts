/**
 * รหัสรอบการทำข้อสอบ (attempt key) ของ AI Tutor — ใช้แยกบทสนทนาต่อรอบ
 *
 * ทำไมต้องมี:
 * - เดิมเธรดผูกกับ (user, question) → ทำชุดเดิมซ้ำ (หรือกด "ทำซ้ำ") แล้วรีเฟรชหน้า
 *   จะเห็นบทสนทนาเก่าของรอบก่อนหน้าปนอยู่
 * - แอปยังไม่มี attempt id ตอนที่กำลังสอบ (สร้างตอนส่งข้อสอบ) → ต้องสร้าง key เอง
 *   ฝั่ง client แล้วเก็บใน sessionStorage (ผูกกับชุดข้อสอบ)
 *   → รีเฟรชในรอบเดิมยังเห็นบทสนทนาเดิม · เริ่มรอบใหม่ได้ key ใหม่
 *
 * ข้อสำคัญ: โควตาไม่ผูกกับ attempt key (ยังนับต่อ user+question ต่อวัน)
 * ไม่งั้นผู้เรียนจะเปลี่ยน key เพื่อเลี่ยงโควตาได้
 */

/** รูปแบบที่ยอมรับ: ตัวอักษร/ขีด/ขีดล่าง 8-64 ตัว (ครอบคลุม UUID) */
export const ATTEMPT_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidAttemptKey(value: unknown): value is string {
  return typeof value === 'string' && ATTEMPT_KEY_PATTERN.test(value);
}

/** คีย์ใน sessionStorage ผูกกับชุดข้อสอบ (คนละชุด = คนละรอบ) */
export function attemptKeyStorageKey(sectionId: string, setId: string | number): string {
  return `ai-tutor-attempt:${sectionId}:${setId}`;
}

function randomAttemptKey(): string {
  // crypto.randomUUID() มีในทุกเบราว์เซอร์สมัยใหม่ (และใน Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback: สุ่มเอง (กรณีแปลก ๆ ที่ไม่มี randomUUID)
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * อ่าน key ของรอบปัจจุบัน — สร้างใหม่ถ้ายังไม่มี
 * (ครั้งแรกที่เปิดชุดข้อสอบนี้ในแท็บนี้)
 */
export function getOrCreateAttemptKey(storageKey: string): string {
  if (typeof window === 'undefined') return randomAttemptKey();
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing && isValidAttemptKey(existing)) return existing;
    const created = randomAttemptKey();
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    // sessionStorage ใช้ไม่ได้ (private mode/quota) — ใช้ key ชั่วคราว
    // (รีเฟรชแล้วบทสนทนาจะไม่ต่อ แต่ยังใช้งานได้)
    return randomAttemptKey();
  }
}

/**
 * สร้างรอบใหม่ — เรียกเมื่อเริ่มรอบใหม่ (กด "ทำซ้ำ" / หลังส่งข้อสอบ)
 * → บทสนทนาเดิมไม่โผล่ในรอบใหม่ (แต่ยังอยู่ใน DB เพื่อวิเคราะห์)
 */
export function rotateAttemptKey(storageKey: string): string {
  const created = randomAttemptKey();
  if (typeof window === 'undefined') return created;
  try {
    window.sessionStorage.setItem(storageKey, created);
  } catch {
    // ignore — ใช้ key ชั่วคราวต่อไป
  }
  return created;
}
