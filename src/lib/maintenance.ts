/**
 * Maintenance mode flag — stored in Upstash Redis so it can be flipped
 * instantly (no redeploy) via the admin API or the Upstash dashboard.
 *
 * Uses RAW fetch() against the Upstash REST API instead of the
 * @upstash/redis client: identical behaviour in the Node runtime and the
 * proxy's Edge sandbox, and no client-side value coercion (the client
 * deserializes '1' to number 1 — see parseMaintenanceValue regression).
 * Fail-open philosophy from rate-limit.ts applies: if Redis is unreachable,
 * the site stays UP rather than locking everyone out.
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const MAINTENANCE_KEY = 'maintenance:mode';

interface UpstashRestResult {
  result?: unknown;
  error?: string;
}

/** Raw GET via Upstash REST — returns the raw string payload or null. */
async function redisGet(key: string): Promise<string | null> {
  if (!REST_URL || !REST_TOKEN) return null;
  const res = await fetch(`${REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    // Never let the flag check hang a request — bounded by cache anyway.
    signal: AbortSignal.timeout(3_000),
  });
  if (!res.ok) throw new Error(`Upstash REST ${res.status}`);
  const data = (await res.json()) as UpstashRestResult;
  return typeof data.result === 'string' ? data.result : null;
}

/** Raw SET via Upstash REST — stores the exact string given. */
async function redisSet(key: string, value: string): Promise<void> {
  if (!REST_URL || !REST_TOKEN) throw new Error('Upstash REST credentials missing');
  const res = await fetch(`${REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`Upstash REST ${res.status}`);
}

// Per-instance stale-while-revalidate cache: the REQUEST PATH never waits
// on Upstash (except once, on the instance's very first call). A flip
// propagates within REVALIDATE_MS via a background refresh.
const REVALIDATE_MS = 30_000;
let cache: { value: boolean; fetchedAt: number } | null = null;
let inflightRefresh: Promise<void> | null = null;

/**
 * Parse the stored flag value. REGRESSION GUARD: the Upstash client
 * deserializes numeric-looking strings to numbers, so redis.get returns
 * `1` (number) even though we stored '1' (string). Compare via String()
 * so both shapes match.
 */
export function parseMaintenanceValue(value: unknown): boolean {
  return `${value}` === '1';
}

async function refreshCache(): Promise<void> {
  try {
    const value = await redisGet(MAINTENANCE_KEY);
    cache = { value: parseMaintenanceValue(value), fetchedAt: Date.now() };
  } catch (error) {
    // Keep the last known value; only default to fail-open when we have
    // nothing cached at all.
    console.error('[maintenance] Redis error:', error);
    if (!cache) cache = { value: false, fetchedAt: Date.now() };
  }
}

export async function isMaintenanceMode(): Promise<boolean> {
  if (cache && Date.now() - cache.fetchedAt < REVALIDATE_MS) return cache.value;

  // Kick off a background refresh at most once at a time.
  if (!inflightRefresh) {
    inflightRefresh = refreshCache().finally(() => {
      inflightRefresh = null;
    });
  }

  // First call on this instance has no cached value yet — wait for it.
  // Every later call returns the cached value immediately while the
  // background refresh updates it for the next request.
  if (!cache) await inflightRefresh;

  return cache?.value ?? false;
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await redisSet(MAINTENANCE_KEY, enabled ? '1' : '0');
  // Update local cache immediately so the toggling instance reflects the
  // new state without waiting out the TTL.
  cache = { value: enabled, fetchedAt: Date.now() };
}

export type MaintenanceAction = 'allow' | 'redirect' | 'api-503';

/**
 * Pure decision function — no I/O, exported for unit testing.
 * Order matters: bypass wins, then API 503, then page redirect,
 * and the maintenance page itself always stays reachable.
 */
export function resolveMaintenanceAction(
  pathname: string,
  isBypassed: boolean,
  maintenanceOn: boolean
): MaintenanceAction {
  if (isBypassed || !maintenanceOn) return 'allow';
  if (pathname.startsWith('/api/')) return 'api-503';
  if (pathname !== '/maintenance') return 'redirect';
  return 'allow';
}
