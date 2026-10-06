/**
 * Per-section test maintenance flags — admin can take a single test part
 * (focus-form, focus-meaning, form-meaning, listening, full) offline for
 * maintenance while the rest of the site stays up.
 *
 * Stored in Upstash Redis as one JSON hash under `tests:maintenance:sections`,
 * completely SEPARATE from the site-wide `maintenance:mode` flag.
 * Fail-open: if Redis is unreachable, every section is considered OPEN so a
 * storage outage can never lock students out of their exams.
 */

export type TestSectionId = 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening' | 'full';

/** พาร์ทที่รองรับการปิดปรับปรุง (id ตรงกับ test_types.id + full test) */
export const TEST_SECTION_IDS: readonly TestSectionId[] = [
  'focus-form',
  'focus-meaning',
  'form-meaning',
  'listening',
  'full',
];

export const TEST_SECTION_LABELS: Record<TestSectionId, string> = {
  'focus-form': 'Focus on Form',
  'focus-meaning': 'Focus on Meaning',
  'form-meaning': 'Form & Meaning',
  'listening': 'Listening',
  'full': 'Full Test',
};

export function isTestSectionId(value: string): value is TestSectionId {
  return (TEST_SECTION_IDS as readonly string[]).includes(value);
}

const SECTIONS_KEY = 'tests:maintenance:sections';

interface UpstashRestResult {
  result?: unknown;
  error?: string;
}

function redisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function redisGetJson(): Promise<Record<string, boolean>> {
  const { url, token } = redisConfig();
  if (!url || !token) return {};
  const res = await fetch(`${url}/get/${encodeURIComponent(SECTIONS_KEY)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(3_000),
  });
  if (!res.ok) throw new Error(`Upstash REST ${res.status}`);
  const data = (await res.json()) as UpstashRestResult;
  if (typeof data.result !== 'string' || !data.result) return {};
  const parsed: unknown = JSON.parse(data.result);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    flags[key] = value === true || `${value}` === '1' || `${value}` === 'true';
  }
  return flags;
}

async function redisSetJson(flags: Record<string, boolean>): Promise<void> {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error('Upstash REST credentials missing');
  const res = await fetch(
    `${url}/set/${encodeURIComponent(SECTIONS_KEY)}/${encodeURIComponent(JSON.stringify(flags))}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) throw new Error(`Upstash REST ${res.status}`);
}

/** แผนที่ sectionId → ปิดปรับปรุง (fail-open: error = ทุกพาร์ทเปิดปกติ) */
export async function getSectionMaintenanceMap(): Promise<Record<TestSectionId, boolean>> {
  const map = Object.fromEntries(TEST_SECTION_IDS.map((id) => [id, false])) as Record<TestSectionId, boolean>;
  try {
    const stored = await redisGetJson();
    for (const id of TEST_SECTION_IDS) {
      if (stored[id]) map[id] = true;
    }
  } catch (error) {
    console.error('[test-section-maintenance] Redis read failed (fail-open):', error);
  }
  return map;
}

export async function isSectionInMaintenance(sectionId: string): Promise<boolean> {
  if (!isTestSectionId(sectionId)) return false;
  return (await getSectionMaintenanceMap())[sectionId] ?? false;
}

/** เปิด/ปิดพาร์ทเดียว แล้วคืนแผนที่ล่าสุด */
export async function setSectionMaintenance(sectionId: TestSectionId, enabled: boolean): Promise<Record<TestSectionId, boolean>> {
  const flags = await redisGetJson().catch(() => ({}) as Record<string, boolean>);
  flags[sectionId] = enabled;
  await redisSetJson(flags);
  return getSectionMaintenanceMap();
}
