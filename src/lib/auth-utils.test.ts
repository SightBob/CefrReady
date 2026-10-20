/**
 * getCurrentUser ต้องไม่พังตอน prod ยังไม่มีคอลัมน์ ai_tutor_access
 *
 * `db.select()` ไม่ระบุคอลัมน์ = SELECT * → ถ้าตาราง users ยังไม่มีคอลัมน์ใหม่
 * คิวรีจะ error และ getCurrentUser คืน null (error ถูกกลืนใน catch) ทำให้
 * "ส่งคำตอบ" ใช้ไม่ได้ทั้งเว็บ — เทสนี้ยืนยันว่าโค้ดระบุคอลัมน์ชัดเจน
 * และไม่มี ai_tutor_access ปนอยู่
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), select: vi.fn() }));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import { getCurrentUser } from './auth-utils';

function stubSelect(rows: unknown[]) {
  mocks.select.mockReturnValue({
    from: () => ({
      where: () => ({ limit: () => Promise.resolve(rows) }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
  stubSelect([{ id: 'user-1', email: 'a@b.com' }]);
});

describe('getCurrentUser — ปลอดภัยเมื่อตาราง users ไม่มี ai_tutor_access', () => {
  it('ระบุคอลัมน์ชัดเจน (ไม่ใช่ SELECT *)', async () => {
    await getCurrentUser();
    const columns = mocks.select.mock.calls[0]?.[0];
    expect(columns).toBeTypeOf('object');
    expect(Object.keys(columns ?? {}).length).toBeGreaterThan(0);
  });

  it('ไม่มี ai_tutor_access ในคอลัมน์ที่เลือก', async () => {
    await getCurrentUser();
    const columns = mocks.select.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(columns)).not.toContain('aiTutorAccess');
  });

  it('ยังคืนผู้ใช้ได้ตามปกติ (ไม่ null)', async () => {
    const user = await getCurrentUser();
    expect(user).toEqual({ id: 'user-1', email: 'a@b.com' });
  });

  it('ไม่ล็อกอิน → null', async () => {
    mocks.auth.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });
});
