import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { requireAllowedOrigin } from './origin-security';

const req = (headers: Record<string, string>): Request =>
  new Request('https://cefr-ready.site/api/tests/check-answer', { method: 'POST', headers });

describe('requireAllowedOrigin', () => {
  const originalEnv = { NEXTAUTH_URL: process.env.NEXTAUTH_URL, ADMIN_EXTRA_ORIGINS: process.env.ADMIN_EXTRA_ORIGINS };

  beforeEach(() => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.ADMIN_EXTRA_ORIGINS;
  });

  afterEach(() => {
    if (originalEnv.NEXTAUTH_URL === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = originalEnv.NEXTAUTH_URL;
    if (originalEnv.ADMIN_EXTRA_ORIGINS === undefined) delete process.env.ADMIN_EXTRA_ORIGINS;
    else process.env.ADMIN_EXTRA_ORIGINS = originalEnv.ADMIN_EXTRA_ORIGINS;
  });

  it('อนุญาต origin ที่อยู่ในรายการ (production)', () => {
    expect(requireAllowedOrigin(req({ origin: 'https://cefr-ready.site', host: 'cefr-ready.site' }))).toBeNull();
  });

  it('อนุญาตเมื่อ origin ตรงกับ host ของ request เอง (dev พอร์ตอื่น/preview domain)', () => {
    // เคสจริง: next dev เลือกพอร์ต 55050 เมื่อ 3000 ไม่ว่าง — เดิมได้ 403 ทำให้กดตรวจคำตอบไม่ได้
    expect(requireAllowedOrigin(req({ origin: 'http://localhost:55050', host: 'localhost:55050' }))).toBeNull();
    expect(
      requireAllowedOrigin(req({ origin: 'https://cefr-ready-git-branch.vercel.app', host: 'cefr-ready-git-branch.vercel.app' })),
    ).toBeNull();
  });

  it('ใช้ x-forwarded-host/-proto เมื่ออยู่หลัง proxy', () => {
    // host ที่แอปเห็นเป็น internal แต่โดเมนจริงมาจาก proxy → ถือว่า same-origin
    expect(
      requireAllowedOrigin(
        req({
          origin: 'https://preview-branch.vercel.app',
          host: 'internal:3000',
          'x-forwarded-host': 'preview-branch.vercel.app',
          'x-forwarded-proto': 'https',
        }),
      ),
    ).toBeNull();
    // origin ไม่ตรงกับ host ที่ proxy บอก → ยังต้องปฏิเสธ
    expect(
      requireAllowedOrigin(
        req({
          origin: 'https://evil.example',
          host: 'internal:3000',
          'x-forwarded-host': 'preview-branch.vercel.app',
          'x-forwarded-proto': 'https',
        }),
      )?.status,
    ).toBe(403);
  });

  it('ปฏิเสธ origin ต่างโดเมน (แม้ host จะตรง)', async () => {
    const res = requireAllowedOrigin(req({ origin: 'https://evil.example', host: 'cefr-ready.site' }));
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ success: false, error: 'Forbidden' });
  });

  it('ปฏิเสธโดเมนที่หน้าตาคล้ายกัน (ไม่ใช้ substring match)', () => {
    expect(requireAllowedOrigin(req({ origin: 'https://cefr-ready.site.evil.com', host: 'cefr-ready.site' }))?.status).toBe(403);
  });

  it('ปฏิเสธเมื่อไม่มีทั้ง Origin และ Referer', () => {
    expect(requireAllowedOrigin(req({ host: 'cefr-ready.site' }))?.status).toBe(403);
  });

  it('รับ Referer แทน Origin ได้', () => {
    expect(requireAllowedOrigin(req({ referer: 'https://cefr-ready.site/tests/focus-form/15', host: 'cefr-ready.site' }))).toBeNull();
  });

  it('รับ headers แบบ Headers object ได้เหมือนกัน', () => {
    expect(requireAllowedOrigin(new Headers({ origin: 'https://cefr-ready.site', host: 'cefr-ready.site' }))).toBeNull();
  });
});
