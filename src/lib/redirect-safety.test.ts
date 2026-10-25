import { describe, expect, it } from 'vitest';

import { DEFAULT_LOGIN_CALLBACK, safeCallbackUrl } from './redirect-safety';

describe('safeCallbackUrl', () => {
  it('ปล่อย path ภายในเว็บผ่านไปตามเดิม', () => {
    expect(safeCallbackUrl('/tests')).toBe('/tests');
    expect(safeCallbackUrl('/tests/focus-form/16')).toBe('/tests/focus-form/16');
    expect(safeCallbackUrl('/progress?tab=week')).toBe('/progress?tab=week');
  });

  it('ไม่มีค่า/ค่าว่าง → ใช้ค่าเริ่มต้น', () => {
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl(null)).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('   ')).toBe(DEFAULT_LOGIN_CALLBACK);
  });

  it('กัน open redirect — ไม่รับ host/scheme หรือ path ที่เบราว์เซอร์ตีความเป็น host', () => {
    expect(safeCallbackUrl('https://evil.example')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('http://evil.example/tests')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('//evil.example')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('/\\evil.example')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('javascript:alert(1)')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('tests')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('/tests\u0000')).toBe(DEFAULT_LOGIN_CALLBACK);
    expect(safeCallbackUrl('/te sts')).toBe(DEFAULT_LOGIN_CALLBACK);
  });

  it('รับค่าเป็น array (searchParam ซ้ำ) → ใช้ค่าแรก', () => {
    expect(safeCallbackUrl(['/progress', '/admin'])).toBe('/progress');
    expect(safeCallbackUrl(['https://evil.example', '/progress'])).toBe(DEFAULT_LOGIN_CALLBACK);
  });

  it('กำหนดค่าเริ่มต้นเองได้ (เช่นหน้าแอดมิน)', () => {
    expect(safeCallbackUrl(undefined, '/admin')).toBe('/admin');
  });
});
