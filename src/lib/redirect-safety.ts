/**
 * ตรวจค่า callbackUrl ที่รับจาก query string ก่อนเอาไป redirect
 *
 * ทำไมต้องตรวจ: /login?callbackUrl=... รับค่าจาก URL ที่ใครก็ส่งมาได้ ถ้าเอาไป
 * redirect ตรง ๆ จะกลายเป็น open redirect (เช่น //evil.com, https://evil.com)
 * ซึ่งถูกเอาไปใช้ฟิชชิงด้วยลิงก์ที่ดูเหมือนมาจากเว็บเรา
 *
 * กติกา: อนุญาตเฉพาะ path ภายในเว็บของเราเอง
 * - ต้องเริ่มด้วย "/" ตัวเดียว (ไม่ใช่ "//" หรือ "/\")
 * - URL เต็ม (http/https) รับได้เฉพาะเมื่อ origin ตรงกับที่ส่งมา แล้วตัดเหลือ path
 *   (next-auth แปลง callbackUrl เป็น URL เต็มเสมอ เช่น http://host/tests/...)
 * - ค่าที่ไม่ผ่าน/ไม่มี → ใช้ค่าเริ่มต้นที่กำหนด
 */

export const DEFAULT_LOGIN_CALLBACK = '/tests';

export function safeCallbackUrl(
  raw: string | string[] | undefined | null,
  fallback: string = DEFAULT_LOGIN_CALLBACK,
  origin?: string,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return fallback;

  let trimmed = value.trim();
  if (!trimmed) return fallback;

  // URL เต็มที่มาจาก next-auth — รับเฉพาะ origin เดียวกันแล้วตัดเหลือ path
  // (ถ้าไม่มี origin ให้เทียบ หรือ origin ไม่ตรง = ไม่รับ)
  if (/^https?:\/\//i.test(trimmed)) {
    if (!origin) return fallback;
    try {
      const url = new URL(trimmed);
      if (url.origin !== origin) return fallback;
      trimmed = `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }

  // ต้องเป็น path ภายในเท่านั้น — "//host" และ "/\host" ถูกเบราว์เซอร์ตีความเป็น host
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback;

  // กันกรณีมี control character/ช่องว่างที่ถูกตัดจนกลายเป็น "//" หลัง decode
  if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) return fallback;

  return trimmed;
}

/**
 * แปลง path ที่ผ่าน safeCallbackUrl แล้วให้เป็น URL เต็มของ origin ปัจจุบัน
 *
 * ทำไมต้องเป็น URL เต็ม: next-auth เก็บปลายทางหลังล็อกอินจากค่า callbackUrl
 * ที่ส่งเข้า signIn() ตรง ๆ — ค่าที่เป็น path อย่างเดียว ("/tests/...") จะถูก
 * ทิ้งแล้วกลับไปใช้ origin ต้นทาง ผลคือผู้ใช้ล็อกอินเสร็จแล้วไปโผล่หน้าแรก
 * ไม่ใช่หน้าที่ตั้งใจไว้ (วัดจริงกับ POST /api/auth/signin/google แล้ว)
 *
 * ความปลอดภัย: path ต้องมาจาก safeCallbackUrl เท่านั้น — origin ที่ไม่ตรงกับ
 * ค่าที่ส่งมาให้ใช้ค่าเริ่มต้นเสมอ
 */
export function absoluteCallbackUrl(path: string, origin: string): string {
  try {
    const base = new URL(origin).origin;
    const url = new URL(path, base);
    if (url.origin !== base) return `${base}${DEFAULT_LOGIN_CALLBACK}`;
    return url.toString();
  } catch {
    return DEFAULT_LOGIN_CALLBACK;
  }
}
