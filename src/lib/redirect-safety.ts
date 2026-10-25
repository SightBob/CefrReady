/**
 * ตรวจค่า callbackUrl ที่รับจาก query string ก่อนเอาไป redirect
 *
 * ทำไมต้องตรวจ: /login?callbackUrl=... รับค่าจาก URL ที่ใครก็ส่งมาได้ ถ้าเอาไป
 * redirect ตรง ๆ จะกลายเป็น open redirect (เช่น //evil.com, https://evil.com)
 * ซึ่งถูกเอาไปใช้ฟิชชิงด้วยลิงก์ที่ดูเหมือนมาจากเว็บเรา
 *
 * กติกา: อนุญาตเฉพาะ path ภายในเว็บของเราเอง
 * - ต้องเริ่มด้วย "/" ตัวเดียว (ไม่ใช่ "//" หรือ "/\")
 * - ห้ามมี scheme หรือ host
 * - ค่าที่ไม่ผ่าน/ไม่มี → ใช้ค่าเริ่มต้นที่กำหนด
 */

export const DEFAULT_LOGIN_CALLBACK = '/tests';

export function safeCallbackUrl(
  raw: string | string[] | undefined | null,
  fallback: string = DEFAULT_LOGIN_CALLBACK,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  // ต้องเป็น path ภายในเท่านั้น — "//host" และ "/\host" ถูกเบราว์เซอร์ตีความเป็น host
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback;

  // กันกรณีมี control character/ช่องว่างที่ถูกตัดจนกลายเป็น "//" หลัง decode
  if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) return fallback;

  return trimmed;
}
