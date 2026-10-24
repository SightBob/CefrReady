/**
 * GET /api/cron/ai-tutor-retention — ล้างข้อมูล AI Tutor เก่าตามนโยบาย retention
 *
 * จุดที่ต้องพิสูจน์:
 * - ไม่มี CRON_SECRET → 503 (ไม่ยอมรันแบบไม่มีสิทธิ์)
 * - token ผิด → 401 และไม่แตะ DB
 * - ค่าเริ่มต้น = dry-run (นับอย่างเดียว ไม่ลบ)
 * - เปิด APPLY=true เท่านั้นจึงลบ · BLANK=true → เว้นว่าง content
 * - AI_TUTOR_RETENTION_DAYS ค่าผิด → 500 และไม่รัน (ไม่ fallback เงียบ ๆ)
 * - DB ล่ม → 503 โดยไม่เผยรายละเอียดภายใน
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  countRetentionTargets: vi.fn(),
  applyRetention: vi.fn(),
}));

// retention.ts import '@/db' (โยน error ถ้าไม่มี DATABASE_URL) → mock ทิ้ง
vi.mock('@/db', () => ({ db: { select: vi.fn(), transaction: vi.fn(), update: vi.fn() } }));
vi.mock('@/lib/ai-tutor/retention', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai-tutor/retention')>(
    '@/lib/ai-tutor/retention',
  );
  return {
    ...actual,
    countRetentionTargets: mocks.countRetentionTargets,
    applyRetention: mocks.applyRetention,
  };
});

import { GET } from './route';

function get(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return GET(
    new Request('http://localhost:3000/api/cron/ai-tutor-retention', { headers }) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'cron-secret-123');
  vi.stubEnv('AI_TUTOR_RETENTION_APPLY', '');
  vi.stubEnv('AI_TUTOR_RETENTION_BLANK', '');
  vi.stubEnv('AI_TUTOR_RETENTION_DAYS', '');
  mocks.countRetentionTargets.mockResolvedValue({ messages: 12, feedback: 3 });
  mocks.applyRetention.mockResolvedValue({ messages: 12, feedback: 3 });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/cron/ai-tutor-retention', () => {
  it('ยังไม่ได้ตั้ง CRON_SECRET → 503 และไม่รันอะไร', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const res = await get('cron-secret-123');
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain('CRON_SECRET');
    expect(mocks.countRetentionTargets).not.toHaveBeenCalled();
    expect(mocks.applyRetention).not.toHaveBeenCalled();
  });

  it('token ไม่ตรง หรือไม่มี header → 401 และไม่แตะ DB', async () => {
    expect((await get()).status).toBe(401);
    expect((await get('wrong-token')).status).toBe(401);
    expect((await get('cron-secret-1234')).status).toBe(401);

    expect(mocks.countRetentionTargets).not.toHaveBeenCalled();
    expect(mocks.applyRetention).not.toHaveBeenCalled();
  });

  it('ค่าเริ่มต้น = dry-run: นับอย่างเดียว ไม่ลบ', async () => {
    const res = await get('cron-secret-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(body.data).toMatchObject({ days: 180, mode: 'dry-run', messages: 12, feedback: 3 });
    expect(mocks.countRetentionTargets).toHaveBeenCalledTimes(1);
    expect(mocks.applyRetention).not.toHaveBeenCalled();
  });

  it('APPLY=true → ลบจริง (blank = false)', async () => {
    vi.stubEnv('AI_TUTOR_RETENTION_APPLY', 'true');

    const res = await get('cron-secret-123');
    const body = await res.json();

    expect(body.data.mode).toBe('delete');
    expect(mocks.applyRetention).toHaveBeenCalledWith(expect.any(Date), false);
    expect(mocks.countRetentionTargets).not.toHaveBeenCalled();
  });

  it('APPLY=true + BLANK=true → เว้นว่าง content แทนการลบแถว', async () => {
    vi.stubEnv('AI_TUTOR_RETENTION_APPLY', 'true');
    vi.stubEnv('AI_TUTOR_RETENTION_BLANK', 'true');

    const body = await (await get('cron-secret-123')).json();
    expect(body.data.mode).toBe('blank');
    expect(mocks.applyRetention).toHaveBeenCalledWith(expect.any(Date), true);
  });

  it('BLANK=true แต่ไม่ได้ APPLY → ยังเป็น dry-run', async () => {
    vi.stubEnv('AI_TUTOR_RETENTION_BLANK', 'true');

    const body = await (await get('cron-secret-123')).json();
    expect(body.data.mode).toBe('dry-run');
    expect(mocks.applyRetention).not.toHaveBeenCalled();
  });

  it('AI_TUTOR_RETENTION_DAYS ผิด (ต่ำกว่าขั้นต่ำ) → 500 และไม่รัน', async () => {
    vi.stubEnv('AI_TUTOR_RETENTION_DAYS', '5');

    const res = await get('cron-secret-123');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('30');
    expect(mocks.countRetentionTargets).not.toHaveBeenCalled();
  });

  it('อ่านจำนวนวันจาก env', async () => {
    vi.stubEnv('AI_TUTOR_RETENTION_DAYS', '90');

    const body = await (await get('cron-secret-123')).json();
    expect(body.data.days).toBe(90);
  });

  it('DB ล่ม → 503 โดยไม่เผย error ภายใน', async () => {
    mocks.countRetentionTargets.mockRejectedValue(
      new Error('relation "ai_tutor_messages" does not exist'),
    );

    const res = await get('cron-secret-123');
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toContain('ยังไม่ได้ลบอะไร');
    expect(JSON.stringify(body)).not.toContain('ai_tutor_messages');
  });
});
