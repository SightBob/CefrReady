// @vitest-environment jsdom
/**
 * endAiTutorAttempt — จบ/ออกจากการทำข้อสอบ → รีเซ็ตประวัติการคุยกับ AI
 *
 * ต้องได้ 2 อย่างพร้อมกัน:
 * 1. หมุนรหัสรอบ (sessionStorage) → ครั้งหน้าที่กลับมาเข้าชุดเดิมได้แชทใหม่
 * 2. แจ้งเซิร์ฟเวอร์ให้เก็บถังบทสนทนาของรอบที่จบ
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attemptKeyStorageKey, getOrCreateAttemptKey } from './attempt-key';
import { endAiTutorAttempt } from './end-attempt';

const STORAGE_KEY = attemptKeyStorageKey('focus-form', 15);

beforeEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('endAiTutorAttempt — รีเซ็ตประวัติการคุยกับ AI', () => {
  it('หมุนรหัสรอบ → ครั้งหน้าที่กลับมาเข้าชุดเดิมได้แชทใหม่', () => {
    const first = getOrCreateAttemptKey(STORAGE_KEY);

    const nextKey = endAiTutorAttempt({ storageKey: STORAGE_KEY, attemptKey: first });

    expect(nextKey).not.toBe(first);
    expect(getOrCreateAttemptKey(STORAGE_KEY)).toBe(nextKey);
  });

  it('แจ้งเซิร์ฟเวอร์ให้เก็บถังบทสนทนาของรอบที่จบ (พร้อมรหัสรอบ)', () => {
    const sendBeacon = vi.fn((_path: string, _payload: Blob) => true);
    vi.stubGlobal('navigator', { sendBeacon });

    endAiTutorAttempt({ storageKey: STORAGE_KEY, attemptKey: 'attempt-aaaa-0001' });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [path, payload] = sendBeacon.mock.calls[0];
    expect(path).toBe('/api/ai-tutor/end');
    expect(payload).toBeInstanceOf(Blob);
    expect(payload.type).toBe('application/json');
  });

  it('ส่งรหัสรอบที่ถูกต้องในเนื้อหา (ให้เซิร์ฟเวอร์เก็บถังได้ถูกรอบ)', async () => {
    const sent: string[] = [];
    vi.stubGlobal('navigator', {
      sendBeacon: vi.fn((_path: string, payload: Blob) => {
        void payload.text().then((text) => { sent.push(text); });
        return true;
      }),
    });

    endAiTutorAttempt({ storageKey: STORAGE_KEY, attemptKey: 'attempt-bbbb-0002' });

    // Blob.text() เป็น async → รอให้เสร็จ
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse(sent[0] ?? '{}')).toEqual({ attemptKey: 'attempt-bbbb-0002' });
  });

  it('ไม่มี sendBeacon → fallback เป็น fetch (keepalive) ไม่ทำให้หน้าค้าง', () => {
    vi.stubGlobal('navigator', {});
    const fetchMock = vi.fn((_path: string, _init: RequestInit) => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    endAiTutorAttempt({ storageKey: STORAGE_KEY, attemptKey: 'attempt-aaaa-0001' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/ai-tutor/end');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(String(init.body))).toEqual({ attemptKey: 'attempt-aaaa-0001' });
  });

  it('ยังหมุนรหัสรอบได้แม้ยังไม่มีรหัสรอบ (attemptKey = null) และไม่ยิงเซิร์ฟเวอร์', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    const first = getOrCreateAttemptKey(STORAGE_KEY);
    const nextKey = endAiTutorAttempt({ storageKey: STORAGE_KEY, attemptKey: null });

    expect(nextKey).not.toBe(first);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('ส่งไม่สำเร็จก็ไม่พัง (หน้าเว็บต้องปิด/ออกได้ตามปกติ)', () => {
    vi.stubGlobal('navigator', {
      sendBeacon: vi.fn(() => {
        throw new Error('beacon failed');
      }),
    });
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('network down');
    }));

    const first = getOrCreateAttemptKey(STORAGE_KEY);
    expect(() => endAiTutorAttempt({ storageKey: STORAGE_KEY, attemptKey: 'attempt-aaaa-0001' })).not.toThrow();
    expect(getOrCreateAttemptKey(STORAGE_KEY)).not.toBe(first);
  });
});
