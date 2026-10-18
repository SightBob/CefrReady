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
 * ตรวจสิทธิ์แอดมิน + จำกัดโควตาในขั้นตอนเดียว
 *
 * requireAdmin() เดิมไม่จำกัดอะไรเลย ทำให้ admin route ที่ดึงข้อมูลเยอะ
 * (เช่น export ที่ดึง attempt 5,000 แถวพร้อมชื่อ-อีเมล) ถูกยิงซ้ำได้ไม่จำกัด
 * แม้ session จะถูกขโมยไปแล้วก็ตาม
 *
 * ใช้ rate limit ที่มีอยู่แล้ว (Upstash) — ไม่เพิ่ม dependency
 */
export async function withAdmin(
  options: AdminRateLimitOptions,
): Promise<{ error: Response | null; session: Session | null }> {
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
}