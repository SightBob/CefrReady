// @vitest-environment jsdom
/**
 * กล่องยืนยันของหน้า /admin/ai-tutor — การเข้าถึงด้วยคีย์บอร์ด
 * (Esc ปิด, โฟกัสเริ่มที่ปุ่มยกเลิก, กัดโฟกัสในกล่อง, คืนโฟกัสตอนปิด)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import ConfirmModal from './ConfirmModal';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(props: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) {
  act(() => {
    root.render(
      <ConfirmModal
        open
        title="ปิดการใช้งาน AI Tutor?"
        description="ระบบจะหยุดการให้บริการ AI ในหน้าทำข้อสอบ"
        onConfirm={() => undefined}
        onCancel={() => undefined}
        {...props}
      />,
    );
  });
}

function dialog(): HTMLElement {
  const element = container.querySelector<HTMLElement>('[role="dialog"]');
  if (!element) throw new Error('ไม่พบกล่องยืนยัน');
  return element;
}

describe('ConfirmModal — การเข้าถึง', () => {
  it('โฟกัสเริ่มที่ปุ่มยกเลิก (ไม่ใช่ปุ่มยืนยัน)', () => {
    render();
    const cancel = [...container.querySelectorAll('button')].find((button) => button.textContent === 'ยกเลิก');
    expect(document.activeElement).toBe(cancel);
  });

  it('กด Esc → เรียก onCancel', () => {
    const onCancel = vi.fn();
    render({ onCancel });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Tab วนในกล่อง (ไม่หลุดไป element นอก)', () => {
    render();
    const buttons = [...dialog().querySelectorAll('button')];
    const last = buttons[buttons.length - 1];

    act(() => {
      last.focus();
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    // โฟกัสถูกดันกลับมาที่ element แรกในกล่อง
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it('ปิดแล้วคืนโฟกัสให้ปุ่มที่เปิดกล่อง', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    render();    // ตอนเปิด โฟกัสย้ายไปปุ่มยกเลิก
    expect(document.activeElement).not.toBe(opener);

    act(() => {
      root.render(
        <ConfirmModal
          open={false}
          title="ปิดการใช้งาน AI Tutor?"
          description="x"
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />,
      );
    });

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
