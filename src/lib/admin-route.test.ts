/**
 * withAdmin — ตรวจสิทธิ์แอดมิน + จำกัดโควตา
 *
 * จุดที่ต้องกัน: error ที่โยนออกมานอก handler (เช่น DB ล่มตอนเช็ค users.is_admin)
 *   → ถ้าไม่ catch จะได้หน้า 500 ของ Next (HTML) ที่ผู้ใช้/แอดมินอ่านไม่ออก
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rateLimit }));

import { withAdmin } from './admin-route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.rateLimit.mockResolvedValue(null);
});

describe('withAdmin', () => {
  it('ผ่าน: คืน session + error = null', async () => {
    const result = await withAdmin({ keySuffix: 'admin:test', maxRequests: 10 });
    expect(result.error).toBeNull();
    expect(result.session?.user?.id).toBe('admin-1');
  });

  it('ไม่ใช่แอดมิน → ส่งต่อ error จาก requireAdmin (401/403)', async () => {
    const denied = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error: denied, session: null });

    const result = await withAdmin({ keySuffix: 'admin:test', maxRequests: 10 });
    expect(result.error).toBe(denied);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it('เกินโควตา → ส่งต่อ 429', async () => {
    const limited = new Response('{}', { status: 429 });
    mocks.rateLimit.mockResolvedValue(limited);

    const result = await withAdmin({ keySuffix: 'admin:test', maxRequests: 10 });
    expect(result.error).toBe(limited);
  });

  it('requireAdmin โยน error (เช่น DB ล่ม) → 500 + ข้อความกลาง ไม่หลุดออกนอก handler', async () => {
    const dbError = Object.assign(
      new Error('Failed query: select "is_admin" from "users"\nparams: admin-1, learner@example.com'),
      { name: 'DrizzleQueryError', code: 'ECONNREFUSED' },
    );
    mocks.requireAdmin.mockRejectedValue(dbError);

    const result = await withAdmin({ keySuffix: 'admin:test', maxRequests: 10 });

    expect(result.error).not.toBeNull();
    expect(result.error?.status).toBe(500);
    expect(result.session).toBeNull();

    const body = await result.error!.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ระบบผู้ดูแลไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
    // ไม่เผยรายละเอียดภายใน (อีเมล/params) ให้ผู้เรียก
    expect(JSON.stringify(body)).not.toContain('learner@example.com');
    expect(JSON.stringify(body)).not.toContain('params:');
  });

  it('log ตอน requireAdmin ล้มไม่มีอีเมล/params (แค่ชื่อ error + code)', async () => {
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(args.map((value) => String(value)).join(' '));
    });

    mocks.requireAdmin.mockRejectedValue(Object.assign(
      new Error('Failed query: select ... where email = $1\nparams: learner@example.com'),
      { name: 'DrizzleQueryError', code: 'ECONNREFUSED' },
    ));

    await withAdmin({ keySuffix: 'admin:test', maxRequests: 10 });

    const output = logged.join('\n');
    expect(output).not.toBe('');
    expect(output).not.toContain('learner@example.com');
    expect(output).toContain('DrizzleQueryError');
    expect(output).toContain('ECONNREFUSED');

    spy.mockRestore();
  });
});
