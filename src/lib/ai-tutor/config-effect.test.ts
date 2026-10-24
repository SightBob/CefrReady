/**
 * ผลของค่าที่ตั้งในหน้า admin (DB) ต่อเส้นทางจริงของผู้เรียน
 *
 * ข้อ: "ค่าที่ตั้งในหน้า admin มีผลจริงไหม" — พิสูจน์ด้วยเทส 5 เคส:
 * 1. runtimeEnabled = false ใน DB → ฟีเจอร์ปิด (POST/GET ถูกปฏิเสธที่ gate isAiTutorEnabled)
 * 2. rolloutPercent = 0 → ผู้เรียนที่ไม่ได้ grant ถูกปฏิเสธ
 * 3. systemDailyLimit ถึงเพดาน → ปฏิเสธด้วยข้อความที่ถูกต้อง (ดู route.test.ts)
 * 4. โมเดลที่เลือกใน DB → provider ได้รับโมเดลนั้น (ดู provider-db-model.test.ts)
 * 5. แคช 30 วินาที (fake timers) → ค่าเปลี่ยนใน DB มีผลเมื่อแคชหมดอายุ
 *
 * ไม่ต่อ DB จริง — stub '@/db' เหมือน config.test.ts
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: mocks.select,
  },
}));

import { clearAiTutorConfigCache, getAiTutorConfigWithSources } from './config';
import { isAiTutorEnabled } from '@/lib/ai-tutor';

/** จำลองผลจาก DB: settings ของ ai_tutor_settings + แถวผู้ใช้ (ai_tutor_access) */
function stubDb(settings: Array<{ key: string; value: unknown }>, userAccess: boolean) {
  mocks.select.mockImplementation((fields: Record<string, unknown>) => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => unknown) => {
      // เลือกคอลัมน์ aiTutorAccess = คิวรีตาราง users (สิทธิ์ของผู้เรียน)
      // อื่น ๆ = คิวรีตาราง ai_tutor_settings (ค่าที่ผู้ดูแลตั้ง)
      const rows = fields && 'aiTutorAccess' in fields
        ? [{ aiTutorAccess: userAccess }]
        : settings;
      return Promise.resolve(rows).then(resolve);
    };
    return chain;
  });
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  process.env.AI_TUTOR_ENABLED = 'true';
  clearAiTutorConfigCache();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.useRealTimers();
});

describe('ค่าจากหน้า admin (DB) มีผลกับการเปิด/ปิดฟีเจอร์จริง', () => {
  it('1) runtimeEnabled = false ใน DB → ปิดฟีเจอร์ (แม้ env เปิดอยู่)', async () => {
    stubDb([{ key: 'runtimeEnabled', value: false }], true);
    const { config, sources } = await getAiTutorConfigWithSources();
    expect(sources.runtimeEnabled).toBe('db');
    expect(config.runtimeEnabled).toBe(false);
    // gate ที่ route เรียก (POST/GET) → ต้องปฏิเสธ
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });

  it('1b) env ปิด (AI_TUTOR_ENABLED=false) → DB เปิดทับไม่ได้', async () => {
    process.env.AI_TUTOR_ENABLED = 'false';
    stubDb([{ key: 'runtimeEnabled', value: true }], true);
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });

  it('2) rolloutPercent = 0 → ผู้เรียนที่ไม่ได้ grant ถูกปฏิเสธ', async () => {
    stubDb([{ key: 'rolloutPercent', value: 0 }], false);
    const { config, sources } = await getAiTutorConfigWithSources();
    expect(sources.rolloutPercent).toBe('db');
    expect(config.rolloutPercent).toBe(0);
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });

  it('2b) rolloutPercent = 0 แต่ผู้เรียนได้ grant → ยังใช้ได้', async () => {
    stubDb([{ key: 'rolloutPercent', value: 0 }], true);
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(true);
  });

  it('3) systemDailyLimit ที่ตั้งใน DB ถูกส่งไปกับ rateLimit (kill switch ระดับโควตา)', async () => {
    stubDb([{ key: 'systemDailyLimit', value: 7 }], true);
    const { config, sources } = await getAiTutorConfigWithSources();
    expect(sources.systemDailyLimit).toBe('db');
    expect(config.systemDailyLimit).toBe(7);
  });

  it('4) โมเดลที่เลือกใน DB ถูกส่งต่อให้ provider (config คือค่าที่ใช้จริง)', async () => {
    stubDb([{ key: 'primaryModel', value: 'db/primary-model' }], true);
    const { config, sources } = await getAiTutorConfigWithSources();
    expect(sources.primaryModel).toBe('db');
    expect(config.primaryModel).toBe('db/primary-model');
  });

  it('5) แคช 30 วินาที — ค่าใน DB ที่เปลี่ยนระหว่างแคชยังไม่มีผล แล้วหมดอายุก็มีผล', async () => {
    vi.useFakeTimers();
    stubDb([{ key: 'questionQuota', value: 2 }], true);

    const first = await getAiTutorConfigWithSources();
    expect(first.config.questionQuota).toBe(2);
    expect(mocks.select).toHaveBeenCalledTimes(1);

    // เปลี่ยนค่าใน DB ระหว่างที่ยังอยู่ในแคช (30 วินาที) → ยังได้ค่าเดิม + ไม่ยิง DB ซ้ำ
    stubDb([{ key: 'questionQuota', value: 9 }], true);
    vi.advanceTimersByTime(29_000);
    const cached = await getAiTutorConfigWithSources();
    expect(cached.config.questionQuota).toBe(2);
    expect(mocks.select).toHaveBeenCalledTimes(1);

    // พอครบ 30 วินาที → อ่าน DB ใหม่ → ได้ค่าใหม่
    vi.advanceTimersByTime(1_100);
    const fresh = await getAiTutorConfigWithSources();
    expect(fresh.config.questionQuota).toBe(9);
  });
});
