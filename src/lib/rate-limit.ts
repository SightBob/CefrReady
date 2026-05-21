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

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (current > maxRequests) {
    const ttl = await redis.ttl(key);
    return { limited: true, retryAfterMs: ttl * 1000 };
  }

  return { limited: false, retryAfterMs: 0 };
}

export function rateLimitResponse(retryAfterMs: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
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
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}
