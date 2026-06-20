import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<{ limited: boolean; retryAfterMs: number }> {
  const { windowMs = 60_000, maxRequests = 10 } = options;
  const key = `rl:${identifier}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      const ttl = await redis.ttl(key);
      return { limited: true, retryAfterMs: ttl * 1000 };
    }

    return { limited: false, retryAfterMs: 0 };
  } catch (error) {
    console.error('[rate-limit] Redis error, failing open:', error);
    return { limited: false, retryAfterMs: 0 };
  }
}

export function rateLimitResponse(retryAfterMs: number) {
  return new Response(
    JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}

export function getRateLimitIdentifier(request: Request): string {
  // SECURITY: prefer platform-trusted headers over the client-supplied
  // X-Forwarded-For. On Vercel, x-vercel-forwarded-for and x-real-ip are set
  // by the platform and cannot be spoofed by clients. Falling back to
  // X-Forwarded-For (which any client can set) would let an attacker bypass
  // every rate limit in the system by rotating a fake IP on each request.
  const vercelIp =
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-real-ip');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}