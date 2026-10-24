// @vitest-environment jsdom
/**
 * useEndAiTutorAttempt — ออกจากการทำข้อสอบ → รีเซ็ตประวัติการคุยกับ AI
 *
 * เทสต์นี้ต้องใช้ DOM จริง เพราะต้องรัน useEffect/cleanup ตามที่ React ทำงานจริง
 * (node environment ทำไม่ได้) → ประกาศ @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attemptKeyStorageKey, getOrCreateAttemptKey } from './attempt-key';
import { useEndAiTutorAttempt } from './use-end-attempt';

// React 19 ปฏิเสธ act() นอก test environment ที่ประกาศไว้ ไม่ตั้งค่านี้
// เทสต์จะรันแต่ผลไม่น่าเชื่อถือ
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness(props: { sectionId: string; setId: string | number; attemptKey: string | null }) {
  useEndAiTutorAttempt(props);
  return null;
}

let container: HTMLDivElement;
let root: Root;
let sendBeacon: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.sessionStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  sendBeacon = vi.fn((_path: string, _payload: Blob) => true);
  vi.stubGlobal('navigator', { sendBeacon });
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useEndAiTutorAttempt — ออกจากการทำข้อสอบ', () => {
  it('ตอนยังอยู่ในหน้า → ยังไม่หมุนรหัสรอบ (แชทเดิมยังอยู่)', () => {
    const storageKey = attemptKeyStorageKey('focus-form', 15);
    const first = getOrCreateAttemptKey(storageKey);

    act(() => {
      root.render(<Harness sectionId="focus-form" setId={15} attemptKey={first} />);
    });

    expect(getOrCreateAttemptKey(storageKey)).toBe(first);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('ออกจากหน้า (unmount) → หมุนรหัสรอบ + แจ้งเซิร์ฟเวอร์ให้เก็บถังบทสนทนา', () => {
    const storageKey = attemptKeyStorageKey('focus-form', 15);
    const first = getOrCreateAttemptKey(storageKey);

    act(() => {
      root.render(<Harness sectionId="focus-form" setId={15} attemptKey={first} />);
    });
    act(() => {
      root.unmount();
    });

    // ครั้งหน้าที่กลับมาเข้าชุดเดิม → รหัสรอบใหม่ = แชทเริ่มใหม่
    expect(getOrCreateAttemptKey(storageKey)).not.toBe(first);
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [path] = sendBeacon.mock.calls[0];
    expect(path).toBe('/api/ai-tutor/end');
  });

  it('เปลี่ยนชุดข้อสอบ → รอบของชุดเดิมถูกปิด (หมุนรหัสของชุดเดิม) แต่ชุดใหม่ไม่โดน', () => {
    const keyOfSet15 = attemptKeyStorageKey('focus-form', 15);
    const keyOfSet16 = attemptKeyStorageKey('focus-form', 16);
    const first15 = getOrCreateAttemptKey(keyOfSet15);
    const first16 = getOrCreateAttemptKey(keyOfSet16);

    act(() => {
      root.render(<Harness sectionId="focus-form" setId={15} attemptKey={first15} />);
    });
    act(() => {
      root.render(<Harness sectionId="focus-form" setId={16} attemptKey={first16} />);
    });

    expect(getOrCreateAttemptKey(keyOfSet15)).not.toBe(first15);
    expect(getOrCreateAttemptKey(keyOfSet16)).toBe(first16);
  });

  it('ยังไม่มีรหัสรอบ (attemptKey = null) → หมุนรหัสได้ แต่ไม่ยิงเซิร์ฟเวอร์', () => {
    const storageKey = attemptKeyStorageKey('focus-form', 15);
    const first = getOrCreateAttemptKey(storageKey);

    act(() => {
      root.render(<Harness sectionId="focus-form" setId={15} attemptKey={null} />);
    });
    act(() => {
      root.unmount();
    });

    expect(getOrCreateAttemptKey(storageKey)).not.toBe(first);
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
