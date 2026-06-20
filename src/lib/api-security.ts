import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from './rate-limit';
import { requireAllowedOrigin } from './origin-security';

export function validateOrigin(request: Request): Response | null {
  // SECURITY: delegates to the shared origin check that compares full URLs
  // (not substring match) and rejects missing Origin headers. See origin-security.ts.
  return requireAllowedOrigin(request);
}

export async function checkRateLimit(
  request: Request,
  options: { windowMs?: number; maxRequests?: number; keySuffix?: string } = {}
): Promise<Response | null> {
  const identifier = getRateLimitIdentifier(request) + (options.keySuffix ? `:${options.keySuffix}` : '');
  const rl = await rateLimit(identifier, {
    windowMs: options.windowMs ?? 60_000,
    maxRequests: options.maxRequests ?? 10,
  });

  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);
  return null;
}

export async function checkIpThrottle(
  request: Request,
  options: { windowMs?: number; maxRequests?: number; keySuffix?: string } = {}
): Promise<Response | null> {
  const ip = getRateLimitIdentifier(request);
  const key = `ip-throttle:${ip}${options.keySuffix ? `:${options.keySuffix}` : ''}`;
  const rl = await rateLimit(key, {
    windowMs: options.windowMs ?? 60_000,
    maxRequests: options.maxRequests ?? 100,
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

export function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}
