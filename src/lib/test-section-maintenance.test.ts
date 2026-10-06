import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock env + fetch ก่อน import module
process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('test-section-maintenance (per-part flags, แยกจาก maintenance:mode)', () => {
  let lib: typeof import('./test-section-maintenance');

  beforeEach(async () => {
    vi.resetModules();
    fetchMock.mockReset();
    lib = await import('./test-section-maintenance');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('default: ทุกพาร์ทเปิดใช้งานเมื่อ Redis ไม่มีค่า', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: null }) });
    const map = await lib.getSectionMaintenanceMap();
    expect(map).toEqual({
      'focus-form': false,
      'focus-meaning': false,
      'form-meaning': false,
      listening: false,
      full: false,
    });
  });

  it('อ่าน flag ต่อพาร์ทจาก Redis', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result: JSON.stringify({ 'focus-form': true, listening: true }) }),
    });
    const map = await lib.getSectionMaintenanceMap();
    expect(map['focus-form']).toBe(true);
    expect(map.listening).toBe(true);
    expect(map['focus-meaning']).toBe(false);
    expect(await lib.isSectionInMaintenance('focus-form')).toBe(true);
    expect(await lib.isSectionInMaintenance('full')).toBe(false);
  });

  it('fail-open: Redis ล่ม = ทุกพาร์ทเปิด (ไม่ล็อกนักเรียนออกจากข้อสอบ)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const map = await lib.getSectionMaintenanceMap();
    expect(Object.values(map).every(Boolean)).toBe(false);
    expect(await lib.isSectionInMaintenance('focus-form')).toBe(false);
  });

  it('id ที่ไม่รู้จักไม่เคยอยู่ในสถานะปิดปรับปรุง', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: null }) });
    expect(await lib.isSectionInMaintenance('does-not-exist')).toBe(false);
  });

  it('setSectionMaintenance เขียนเฉพาะพาร์ทนั้น แล้งค่าอื่นเดิม', async () => {
    fetchMock
      // read ก่อนเขียน
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ listening: true }) }),
      })
      // set
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: 'OK' }) })
      // read หลังเขียน (คืนแผนที่)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ 'focus-form': true, listening: true }) }),
      });
    const map = await lib.setSectionMaintenance('focus-form', true);
    const setCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/set/'));
    expect(setCall).toBeTruthy();
    const body = JSON.parse(decodeURIComponent(String(setCall![0]).split('/set/')[1].split('/').slice(1).join('/')));
    expect(body).toEqual({ listening: true, 'focus-form': true });
    expect(map).toMatchObject({ 'focus-form': true, listening: true });
  });

  it('ปิดพาร์ท: flag เป็น false เมื่อสั่งปิด=false', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ 'focus-form': true }) }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: 'OK' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ 'focus-form': false }) }),
      });
    const map = await lib.setSectionMaintenance('focus-form', false);
    expect(map).toMatchObject({ 'focus-form': false });
  });
});
