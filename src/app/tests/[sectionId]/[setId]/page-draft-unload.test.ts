/**
 * draft sync ตอนผู้เรียนออกจากหน้า
 *
 * pusher มี debounce 5 วิ — ถ้าปิดแท็บ/สลับแอปก่อนครบ คำตอบจะไม่ถึงเซิร์ฟเวอร์
 * (sessionStorage ของแท็บนั้นหายไปพร้อมแท็บ) จึงต้อง flushNow() ตอน pagehide
 * และ visibilitychange=hidden (บนมือถือ pagehide ไม่ค่อยทำงาน)
 *
 * เทสอ่านซอร์สตรง (แนวเดียวกับ page-draft-submit.test.ts) เพราะหน้าเป็น
 * client component ขนาดใหญ่ที่ผูกกับ API หลายตัว
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);
const pusherSrc = readFileSync(join(process.cwd(), 'src/lib/test-draft-sync.ts'), 'utf8');

describe('draft sync ก่อนออกจากหน้า', () => {
  it('debounce 5 วิ', () => {
    expect(pusherSrc).toContain('const SYNC_DELAY_MS = 5000;');
  });

  it('ฟังทั้ง visibilitychange(hidden) และ pagehide', () => {
    expect(pageSrc).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(pageSrc).toContain("if (document.visibilityState === 'hidden') flushDraft();");
    expect(pageSrc).toContain("window.addEventListener('pagehide', flushDraft)");
  });

  it('เรียก flushNow() (ไม่ใช่ push ใหม่)', () => {
    expect(pageSrc).toContain('draftPusher.current?.flushNow();');
  });

  it('ถอด listener ตอน unmount', () => {
    expect(pageSrc).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
    expect(pageSrc).toContain("window.removeEventListener('pagehide', flushDraft)");
  });

  it('ไม่แตะ listener ของ analytics (test_abandoned) ที่มีอยู่เดิม', () => {
    // ของเดิมยังอยู่ครบ — สอง listener ต้องแยกกัน
    expect(pageSrc).toContain('const onPageHide = () => fireAbandoned(true);');
    expect(pageSrc).toContain("window.addEventListener('pagehide', onPageHide)");
    expect(pageSrc).toContain("window.removeEventListener('pagehide', onPageHide)");
  });
});
