/**
 * fetchAdminJson ต้องจับทั้ง 3 แบบที่ทำให้หน้า admin เคยแสดงผิด:
 *   1. network error (fetch พัง/timeout)
 *   2. res.ok === false (401/500)
 *   3. HTTP 200 แต่ body เป็น { success: false }
 *
 * เดิมทั้ง 3 หน้า admin ที่ใช้ fetch ตรง ๆ จับแค่ข้อ 1 แล้วกลืนทิ้ง
 * → แอดมินเห็นหน้าว่างที่ดูเหมือนไม่มีข้อมูล
 */
import { describe, expect, it, vi, afterEach } from 'vitest';

import { fetchAdminJson } from './admin-fetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('fetchAdminJson', () => {
  it('คืน data เมื่อทุกอย่างปกติ', async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ success: true, data: { a: 1 } }) }));
    await expect(fetchAdminJson<{ a: number }>('/api/x')).resolves.toEqual({ a: 1 });
  });

  it('throw เมื่อ network error', async () => {
    stubFetch(async () => { throw new TypeError('fetch failed'); });
    await expect(fetchAdminJson('/api/x')).rejects.toThrow();
  });

  it('throw เมื่อ res.ok เป็น false', async () => {
    stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await expect(fetchAdminJson('/api/x')).rejects.toThrow(/500/);
  });

  it('throw เมื่อ body เป็น success: false', async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ success: false, error: 'ไม่มีสิทธิ์' }) }));
    await expect(fetchAdminJson('/api/x')).rejects.toThrow(/ไม่มีสิทธิ์/);
  });

  it('throw เมื่อ body ไม่มี success', async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ data: null }) }));
    await expect(fetchAdminJson('/api/x')).rejects.toThrow();
  });

  it('throw เมื่อ body ไม่ใช่ JSON', async () => {
    stubFetch(async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } }));
    await expect(fetchAdminJson('/api/x')).rejects.toThrow();
  });
});