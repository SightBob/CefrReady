/**
 * การรวมค่า AI Tutor: DB ทับ env + validate + fallback เมื่อ DB ล้มเหลว
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  findModel: vi.fn(),
}));

// db จำลอง — config อ่าน/เขียนผ่าน dynamic import ของ '@/db'
vi.mock('@/db', () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

// รายชื่อโมเดลจำลอง (config import แบบ dynamic)
vi.mock('./models', () => ({
  findModel: mocks.findModel,
  clearOpenRouterModelsCache: vi.fn(),
}));

import {
  clearAiTutorConfigCache,
  getAiTutorConfigWithSources,
  normalizeConfig,
  saveAiTutorSettings,
} from './config';

function stubSettings(rows: Array<{ key: string; value: unknown }>) {
  // chain ที่รองรับทั้ง await ตรง ๆ และ .where().limit()
  mocks.select.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    return chain;
  });
}

function stubDbError() {
  mocks.select.mockImplementation(() => {
    throw new Error('DB ล่ม');
  });
}

function stubInsert() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  chain.returning = vi.fn(() => chain);
  mocks.insert.mockReturnValue(chain);
  return chain;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  process.env.AI_TUTOR_ENABLED = 'true';
  process.env.AI_TUTOR_MODEL = 'env/primary-model';
  process.env.AI_TUTOR_FALLBACK_MODEL = 'env/fallback-model';
  process.env.AI_TUTOR_REASONING_EFFORT = 'low';
  process.env.AI_TUTOR_QUESTION_QUOTA = '5';
  clearAiTutorConfigCache();
});

describe('getAiTutorConfigWithSources — DB ทับ env', () => {
  it('ค่าไม่ได้ตั้งใน DB → ใช้ค่าจาก env และไม่มี source เป็น db', async () => {
    stubSettings([]);
    const { config, sources } = await getAiTutorConfigWithSources();
    expect(config.primaryModel).toBe('env/primary-model');
    expect(sources.primaryModel).toBeUndefined();
  });

  it('ค่าที่ตั้งใน DB → ทับค่าจาก env และระบุ source = db', async () => {
    stubSettings([
      { key: 'primaryModel', value: 'db/primary-model' },
      { key: 'questionQuota', value: 3 },
    ]);
    const { config, sources } = await getAiTutorConfigWithSources();
    expect(config.primaryModel).toBe('db/primary-model');
    expect(config.questionQuota).toBe(3);
    expect(sources.primaryModel).toBe('db');
    expect(sources.questionQuota).toBe('db');
  });

  it('ค่าที่ไม่รู้จักใน DB → ข้าม (ไม่ทำให้ระบบพัง)', async () => {
    stubSettings([{ key: 'unknownKey', value: 1 }]);
    const { config, warnings } = await getAiTutorConfigWithSources();
    expect(config.primaryModel).toBe('env/primary-model');
    expect(warnings.join(' ')).toContain('unknownKey');
  });

  it('ค่าใน DB ไม่ผ่าน validate → ข้ามค่านั้น ใช้ env แทน', async () => {
    stubSettings([{ key: 'questionQuota', value: 9999 }]);
    const { config, warnings } = await getAiTutorConfigWithSources();
    expect(config.questionQuota).toBe(5); // ค่าจาก env
    expect(warnings.join(' ')).toContain('questionQuota');
  });

  it('อ่าน DB ล้มเหลว → ใช้ค่าจาก env ทั้งหมด + เตือน (ไม่ throw)', async () => {
    stubDbError();
    const { config, warnings } = await getAiTutorConfigWithSources();
    expect(config.primaryModel).toBe('env/primary-model');
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('runtimeEnabled — สวิตช์ปิดชั่วคราว', () => {
  it('env เปิด + DB ไม่ได้ตั้ง → เปิด', async () => {
    stubSettings([]);
    const { config } = await getAiTutorConfigWithSources();
    expect(config.runtimeEnabled).toBe(true);
  });

  it('env เปิด + DB ตั้ง runtimeEnabled = false → ปิด', async () => {
    stubSettings([{ key: 'runtimeEnabled', value: false }]);
    const { config } = await getAiTutorConfigWithSources();
    expect(config.runtimeEnabled).toBe(false);
  });

  it('env ปิด → DB ตั้ง runtimeEnabled = true ก็ยังปิด (ห้ามเปิดทับ env)', async () => {
    process.env.AI_TUTOR_ENABLED = 'false';
    stubSettings([{ key: 'runtimeEnabled', value: true }]);
    const { config } = await getAiTutorConfigWithSources();
    expect(config.runtimeEnabled).toBe(false);
  });
});

describe('แคชในหน่วยความจำ', () => {
  it('อ่านซ้ำใน 30 วินาที → ใช้แคช (ไม่ยิง DB ซ้ำ)', async () => {
    stubSettings([{ key: 'questionQuota', value: 2 }]);
    await getAiTutorConfigWithSources();
    await getAiTutorConfigWithSources();
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it('clearAiTutorConfigCache() → อ่าน DB ใหม่', async () => {
    stubSettings([{ key: 'questionQuota', value: 2 }]);
    await getAiTutorConfigWithSources();
    clearAiTutorConfigCache();
    await getAiTutorConfigWithSources();
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });
});

describe('normalizeConfig — บีบค่าให้อยู่ในขอบเขต (เส้นทางอ่านตอนรัน)', () => {
  const base = {
    envMasterEnabled: true,
    runtimeEnabled: true,
    primaryModel: 'm',
    fallbackModel: null,
    primaryEffort: 'low' as const,
    fallbackEffort: 'none' as const,
    maxTokens: 1200,
    timeoutMs: 30000,
    firstTokenTimeoutMs: 12000,
    questionQuota: 5,
    userDailyLimit: 50,
    systemDailyLimit: 10000,
    rolloutPercent: 0,
    promptCache: false,
  };

  it('timeout เกินเพดาน → บีบกลับ', () => {
    const result = normalizeConfig({ ...base, timeoutMs: 120_000 }, base);
    expect(result.timeoutMs).toBe(30_000);
  });

  it('firstTokenTimeoutMs เกิน timeoutMs → บีบให้เท่ากัน', () => {
    const result = normalizeConfig({ ...base, timeoutMs: 10_000, firstTokenTimeoutMs: 20_000 }, base);
    expect(result.firstTokenTimeoutMs).toBe(10_000);
  });

  it('runtimeEnabled = true แต่ env ปิด → ยังปิด', () => {
    const result = normalizeConfig({ ...base, runtimeEnabled: true }, { ...base, envMasterEnabled: false });
    expect(result.runtimeEnabled).toBe(false);
  });

  it('เพดานรายวันน้อยกว่าโควตาต่อข้อ → ลดโควตาต่อข้อลงให้เท่ากับเพดานรายวัน (ไม่ไปเพิ่มเพดานรายวัน)', () => {
    const result = normalizeConfig({ ...base, questionQuota: 10, userDailyLimit: 3 }, base);
    expect(result.questionQuota).toBe(3);
    expect(result.userDailyLimit).toBe(3);
  });

  it('ค่าทั้งสองอยู่ในช่วงแต่ผิดความสัมพันธ์ → บังคับเสมอ (ไม่ใช่แค่ตอนบันทึก)', () => {
    const result = normalizeConfig({ ...base, questionQuota: 8, userDailyLimit: 2 }, base);
    expect(result.questionQuota).toBe(2);
    expect(result.userDailyLimit).toBe(2);
  });

  it('โควตาต่อข้อถูกบีบลงมาก่อน → เทียบกับเพดานรายวันที่บีบแล้ว', () => {
    // questionQuota เดิม 20 → บีบเป็น 10 (ช่วงใหม่ 1–10) → แล้วเทียบกับเพดานรายวัน
    const result = normalizeConfig({ ...base, questionQuota: 20, userDailyLimit: 5 }, base);
    expect(result.questionQuota).toBe(5);
    expect(result.userDailyLimit).toBe(5);
  });

  it('เพดานรายวันสูงกว่าโควตาต่อข้อ → ไม่ถูกแก้ (คงค่าที่ผู้ดูแลตั้ง)', () => {
    const result = normalizeConfig({ ...base, questionQuota: 5, userDailyLimit: 50 }, base);
    expect(result.questionQuota).toBe(5);
    expect(result.userDailyLimit).toBe(50);
  });

  it('ค่าปกติ → ไม่ถูกแก้', () => {
    const result = normalizeConfig({ ...base }, base);
    expect(result.userDailyLimit).toBe(50);
    expect(result.questionQuota).toBe(5);
  });
});

describe('saveAiTutorSettings — ตรวจก่อนเขียน', () => {
  it('ปฏิเสธ key ที่เป็น secret', async () => {
    const result = await saveAiTutorSettings({ OPENROUTER_API_KEY: 'sk-xxx' }, 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('OPENROUTER_API_KEY');
  });

  it('ปฏิเสธ key ที่ไม่รู้จัก', async () => {
    const result = await saveAiTutorSettings({ hack: 1 }, 'admin-1');
    expect(result.ok).toBe(false);
  });

  it('ปฏิเสธค่าที่อยู่นอกช่วง (quota เกิน 20)', async () => {
    const result = await saveAiTutorSettings({ questionQuota: 50 }, 'admin-1');
    expect(result.ok).toBe(false);
  });

  it('ปฏิเสธ timeout ที่เกินเพดาน พร้อมอธิบาย', async () => {
    const result = await saveAiTutorSettings({ timeoutMs: 120_000 }, 'admin-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('30000');
  });

  it('ปฏิเสธ firstTokenTimeoutMs ที่เกิน timeoutMs', async () => {
    const result = await saveAiTutorSettings({ timeoutMs: 10_000, firstTokenTimeoutMs: 20_000 }, 'admin-1');
    expect(result.ok).toBe(false);
  });

  it('เขียนลง DB + เขียน audit + ล้างแคชเมื่อค่าถูกต้อง', async () => {
    stubSettings([]);
    stubInsert();
    const result = await saveAiTutorSettings({ questionQuota: 3 }, 'admin-1');
    expect(result.ok).toBe(true);
    expect(mocks.insert).toHaveBeenCalled();
  });

  it('โมเดลที่พิมพ์เองแล้วไม่อยู่ในแคช → ดึงรายชื่อใหม่แล้วบันทึกได้', async () => {
    stubSettings([]);
    stubInsert();
    mocks.findModel
      // ครั้งแรก: ไม่เจอในแคช 15 นาที
      .mockResolvedValueOnce(undefined)
      // ครั้งที่สอง (refresh): เจอแล้ว → ผ่านการตรวจราคา/ระดับ effort
      .mockResolvedValueOnce({
        id: 'vendor/new-model:free',
        name: 'New Model',
        pricing: { prompt: 0, completion: 0 },
        reasoningMandatory: false,
        supportedEfforts: [],
        contextLength: 8000,
        overPriceLimit: false,
        supportsEffort: () => true,
      });

    const result = await saveAiTutorSettings({ primaryModel: 'vendor/new-model:free' }, 'admin-1');

    expect(result.ok).toBe(true);
    expect(mocks.findModel).toHaveBeenCalledTimes(2);
    // ครั้งที่สองต้องข้ามแคช
    expect(mocks.findModel.mock.calls[1]?.[1]).toEqual({ refresh: true });
  });

  it('ไม่พบโมเดลแม้ดึงรายชื่อใหม่แล้ว → ปฏิเสธพร้อมข้อความ', async () => {
    stubSettings([]);
    stubInsert();
    mocks.findModel.mockResolvedValue(undefined);

    const result = await saveAiTutorSettings({ primaryModel: 'vendor/typo-model' }, 'admin-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('ไม่พบโมเดล');
  });
});
