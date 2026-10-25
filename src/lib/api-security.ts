import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from './rate-limit';
import { requireAllowedOrigin } from './origin-security';

export function validateOrigin(request: Request): Response | null {
  // SECURITY: delegates to the shared origin check that compares full URLs
  // (not substring match) and rejects missing Origin headers. See origin-security.ts.
  return requireAllowedOrigin(request);
}

export async function checkIpThrottle(
  request: Request,
  options: { windowMs?: number; maxRequests?: number; keySuffix?: string } = {}
): Promise<Response | null> {
  const ip = getRateLimitIdentifier(request);
  const key = `ip-throttle:${ip}${options.keySuffix ? `:${options.keySuffix}` : ''}`;
  const rl = await rateLimit(key, {
    windowMs: options.windowMs ?? 60_000,
    // ค่า default นี้คือเพดาน "ต่อ IP" ไม่ใช่ต่อคน — ผู้เรียนทั้งห้อง/ทั้งมหาลัย
    // มักออกเน็ตผ่าน IP เดียวกัน (NAT/CGNAT) เดิม 100/นาที ทำให้ห้อง 40 คนที่กด
    // เริ่มชุด + ทำต่อพร้อมกันชนเพดานทั้งที่แต่ละคนยังไม่ถึงลิมิตของตัวเอง
    // 300/นาที ยังคุมการยิงรัวจาก IP เดียวได้ (5 ครั้ง/วินาที) โดยไม่ตัดคนทั้งห้อง
    maxRequests: options.maxRequests ?? 300,
  });

  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);
  return null;
}

export async function checkUserRateLimit(
  userId: string,
  options: { windowMs?: number; maxRequests?: number; keySuffix?: string } = {}
): Promise<Response | null> {
  const key = `user:${userId}${options.keySuffix ? `:${options.keySuffix}` : ''}`;
  const rl = await rateLimit(key, {
    windowMs: options.windowMs ?? 60_000,
    maxRequests: options.maxRequests ?? 10,
  });

  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);
  return null;
}
