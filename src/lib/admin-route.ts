import { requireAdmin } from './admin-auth';
import { checkUserRateLimit } from './api-security';
import type { Session } from 'next-auth';

export interface AdminRateLimitOptions {
  /** แยกโควตาต่อ route เช่น 'admin-export' */
  keySuffix: string;
  maxRequests: number;
  windowMs?: number;
}

/**
 * สรุป error แบบปลอดภัยมาก ๆ สำหรับ log ของ route กลาง
 * (แค่ชื่อ error + code — ไม่เอา message/params/stack เพราะอาจมีค่า PII)
 */
function describeErrorSafely(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return `${error.name}${typeof code === 'string' && code ? ` (code ${code})` : ''}`;
  }
  return 'UnknownError';
}

/**
 * ตรวจสิทธิ์แอดมิน + จำกัดโควตาในขั้นตอนเดียว
 *
 * requireAdmin() เดิมไม่จำกัดอะไรเลย ทำให้ admin route ที่ดึงข้อมูลเยอะ
 * (เช่น export ที่ดึง attempt 5,000 แถวพร้อมชื่อ-อีเมล) ถูกยิงซ้ำได้ไม่จำกัด
 * แม้ session จะถูกขโมยไปแล้วก็ตาม
 *
 * ใช้ rate limit ที่มีอยู่แล้ว (Upstash) — ไม่เพิ่ม dependency
 *
 * ⚠️ ครอบ try/catch: ถ้า requireAdmin() โยน error (เช่น DB ล่มตอนเช็คสิทธิ์แอดมิน)
 *   จะไม่หลุดออกนอก handler (หน้าเว็บได้ HTML 500 ที่อ่านไม่ออก) → ตอบ 500 + ข้อความกลางแทน
 */
export async function withAdmin(
  options: AdminRateLimitOptions,
): Promise<{ error: Response | null; session: Session | null }> {
  try {
    const { error, session } = await requireAdmin();
    if (error) return { error, session: null };

    const userId = session?.user?.id;
    if (!userId) return { error: null, session: null };

    const limited = await checkUserRateLimit(userId, {
      keySuffix: options.keySuffix,
      maxRequests: options.maxRequests,
      ...(options.windowMs ? { windowMs: options.windowMs } : {}),
    });
    if (limited) return { error: limited, session: null };

    return { error: null, session };
  } catch (error) {
    // log แค่ชื่อ error + code (ไม่ log message/params ที่อาจมีอีเมล/ค่าของผู้ใช้)
    console.error(`[admin-route] ตรวจสิทธิ์ผู้ดูแลไม่สำเร็จ: ${describeErrorSafely(error)}`);
    return {
      error: new Response(
        JSON.stringify({ success: false, error: 'ระบบผู้ดูแลไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
      session: null,
    };
  }
}