import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

// db จำลอง — isAiTutorEnabled ไปถึง `.select().from().where()`
vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import {
  aiTutorInRollout,
  aiTutorMasterSwitchEnabled,
  aiTutorRolloutBucket,
  aiTutorRolloutPercent,
  isAiTutorEnabled,
  isAiTutorEnabledByFlags,
} from './ai-tutor';

function accessRows(value: boolean): { aiTutorAccess?: boolean }[] {
  return [{ aiTutorAccess: value }];
}

function stubAccess(value: boolean) {
  mocks.select.mockReturnValue({
    from: () => ({ where: vi.fn().mockResolvedValue(accessRows(value)) }),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  delete process.env.AI_TUTOR_ENABLED;
  delete process.env.AI_TUTOR_ROLLOUT_PERCENT;
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...process.env };
});

describe('isAiTutorEnabled — master switch', () => {
  it('ไม่ตั้ง env = ปิดกับทุกคน และไม่แตะ DB', async () => {
    const result = await isAiTutorEnabled({ id: 'u1' });
    expect(result).toBe(false);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('env AI_TUTOR_ENABLED=false = ปิดกับทุกคน', async () => {
    process.env.AI_TUTOR_ENABLED = 'false';
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('ไม่มี user (ยังไม่ล็อกอิน) = ปิด', async () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    expect(await isAiTutorEnabled(null)).toBe(false);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('ยอมรับทั้ง "true" และ "1"', async () => {
    stubAccess(false);
    process.env.AI_TUTOR_ENABLED = '1';
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
    process.env.AI_TUTOR_ENABLED = 'true';
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });
});

describe('isAiTutorEnabled — สิทธิ์จาก users.ai_tutor_access', () => {
  beforeEach(() => {
    process.env.AI_TUTOR_ENABLED = 'true';
  });

  it('บัญชีไม่มีสิทธิ์ + ไม่ตั้ง rollout = ไม่เห็น', async () => {
    stubAccess(false);
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });

  it('บัญชีมีสิทธิ์ = เห็น', async () => {
    stubAccess(true);
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(true);
  });

  it('ไม่มีแถวใน users ก็ไม่พัง แค่ไม่เห็น', async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) });
    expect(await isAiTutorEnabled({ id: 'ghost' })).toBe(false);
  });
});

describe('isAiTutorEnabled — rollout เปอร์เซ็นต์ (ทางเลือก)', () => {
  beforeEach(() => {
    process.env.AI_TUTOR_ENABLED = 'true';
    stubAccess(false);
  });

  it('ไม่ตั้ง AI_TUTOR_ROLLOUT_PERCENT = ปิดไว้เป็นค่าเริ่มต้น', async () => {
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });

  it('ตั้ง 0 หรือค่าไม่ใช่ตัวเลข = ปิด', async () => {
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '0';
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
    process.env.AI_TUTOR_ROLLOUT_PERCENT = ' abc';
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(false);
  });

  it('100 = เห็นทุกบัญชี แม้ไม่มีสิทธิ์เฉพาะบัญชี', async () => {
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '100';
    expect(await isAiTutorEnabled({ id: 'u1' })).toBe(true);
  });

  it('ผลคงที่ตาม user id — id เดิมได้คำตอบเดิมทุกครั้ง (hash ถาวร)', async () => {
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '50';
    const first = await isAiTutorEnabled({ id: 'user-7f3c' });
    const repeated = await isAiTutorEnabled({ id: 'user-7f3c' });
    const byBucket = aiTutorRolloutBucket('user-7f3c') < 50;
    expect(first).toBe(byBucket);
    expect(repeated).toBe(first);
  });

  it('สิทธิ์เฉพาะบัญชีชนะ แม้ bucket ตกกลุ่มนอก rollout', async () => {
    stubAccess(true);
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '1';
    // bucket คนนี้จะเป็นเท่าไรก็ได้ — มีสิทธิ์แล้วต้องเห็นเสมอ
    expect(await isAiTutorEnabled({ id: 'user-9f2a' })).toBe(true);
  });
});

describe('master switch / rollout / bucket (ใช้ร่วมกับสคริปต์รายงาน)', () => {
  it('master switch: ไม่ตั้ง = ปิด · "true"/"1" = เปิด · "false" = ปิด', () => {
    delete process.env.AI_TUTOR_ENABLED;
    expect(aiTutorMasterSwitchEnabled()).toBe(false);
    process.env.AI_TUTOR_ENABLED = 'true';
    expect(aiTutorMasterSwitchEnabled()).toBe(true);
    process.env.AI_TUTOR_ENABLED = '1';
    expect(aiTutorMasterSwitchEnabled()).toBe(true);
    process.env.AI_TUTOR_ENABLED = 'false';
    expect(aiTutorMasterSwitchEnabled()).toBe(false);
  });

  it('bucket คงที่ต่อ user id (คนเดิมได้กลุ่มเดิมเสมอ)', () => {
    expect(aiTutorRolloutBucket('user-1')).toBe(aiTutorRolloutBucket('user-1'));
    expect(aiTutorRolloutBucket('user-1')).not.toBe(aiTutorRolloutBucket('user-2'));
    expect(aiTutorRolloutBucket('user-1')).toBeGreaterThanOrEqual(0);
    expect(aiTutorRolloutBucket('user-1')).toBeLessThan(100);
  });

  it('aiTutorInRollout เทียบกับ bucket เดียวกันเป๊ะ', () => {
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '30';
    for (const id of ['a', 'b', 'c', 'user-7f3c', '50a71875']) {
      expect(aiTutorInRollout(id)).toBe(aiTutorRolloutBucket(id) < 30);
    }
  });

  it('เปอร์เซ็นต์ = 100 → ทุกคนเข้ากลุ่ม · ไม่ตั้ง → ไม่มีใครเข้ากลุ่ม', () => {
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '100';
    expect(aiTutorRolloutPercent()).toBe(100);
    expect(aiTutorInRollout('คนไหนก็ได้')).toBe(true);
    delete process.env.AI_TUTOR_ROLLOUT_PERCENT;
    expect(aiTutorRolloutPercent()).toBe(0);
    expect(aiTutorInRollout('คนไหนก็ได้')).toBe(false);
  });
});

describe('isAiTutorEnabledByFlags — ตรรกะเดียวกับที่ API ใช้ (ไม่แตะ DB)', () => {
  it('สิทธิ์เฉพาะบัญชี → เปิด (ไม่ต้องพึ่ง rollout)', () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    expect(isAiTutorEnabledByFlags('u1', true)).toBe(true);
  });

  it('ไม่มีสิทธิ์ + ไม่มี rollout → ปิด', () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    delete process.env.AI_TUTOR_ROLLOUT_PERCENT;
    expect(isAiTutorEnabledByFlags('u1', false)).toBe(false);
  });

  it('ไม่มีสิทธิ์ + อยู่ในกลุ่ม rollout → เปิด', () => {
    process.env.AI_TUTOR_ENABLED = 'true';
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '100';
    expect(isAiTutorEnabledByFlags('u1', false)).toBe(true);
  });

  it('master ปิด → ไม่มีใครเปิดได้ แม้มีสิทธิ์', () => {
    delete process.env.AI_TUTOR_ENABLED;
    process.env.AI_TUTOR_ROLLOUT_PERCENT = '100';
    expect(isAiTutorEnabledByFlags('u1', true)).toBe(false);
    expect(isAiTutorEnabledByFlags('u1', false)).toBe(false);
  });

  it('ตรงกับผลของ isAiTutorEnabled (ที่อ่าน DB) เสมอ', async () => {
    for (const access of [true, false]) {
      for (const percent of ['0', '50', '100']) {
        process.env.AI_TUTOR_ENABLED = 'true';
        process.env.AI_TUTOR_ROLLOUT_PERCENT = percent;
        stubAccess(access);
        const fromDb = await isAiTutorEnabled({ id: 'user-7f3c' });
        const fromFlags = isAiTutorEnabledByFlags('user-7f3c', access);
        expect(fromFlags).toBe(fromDb);
      }
    }
  });
});
