/**
 * refresh แล้วต้องได้ทั้ง "ตำแหน่งข้อ" และ "คำตอบ/สถานะเฉลย" กลับมา
 * (เดิมเก็บแค่ตำแหน่ง → ตัวนับกลับเป็น 0 และปุ่มเลขข้อขึ้น "ยังไม่ได้ตอบ")
 *
 * เทสอ่านซอร์สตรง (แนวเดียวกับ page-tutor-flag.test.ts) เพราะหน้าเป็น client
 * component ขนาดใหญ่ที่ผูกกับ API หลายตัว — สิ่งที่ต้องกันคือ "การต่อสาย" ไม่หลุด
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

describe('หน้าข้อสอบคืนคำตอบหลัง refresh', () => {
  it('ดึง state ที่บันทึกไว้ (ไม่ใช่แค่ตำแหน่งข้อ) มาตอนโหลดชุด', () => {
    expect(pageSrc).toContain('loadTestProgressState');
    expect(pageSrc).toContain('const restoredProgress = previewMode ? null : loadTestProgressState(sectionId, setId);');
    expect(pageSrc).toContain('setCheckedSlots(restoredProgress?.checked ?? {});');
  });

  it('คืนคำตอบที่เลือกไว้ของข้อปัจจุบันด้วย', () => {
    expect(pageSrc).toContain('restoredProgress.answers[restoredProgress.index] ?? null');
  });

  it('บันทึกคำตอบ + สถานะเฉลยทุกครั้งที่เปลี่ยน', () => {
    expect(pageSrc).toContain('saveTestProgressState(sectionId, setId, {');
    expect(pageSrc).toContain('checked: checkedSlots,');
  });

  it('ไม่บันทึกทับด้วยอาร์เรย์ว่างก่อนโหลดชุดเสร็จ', () => {
    expect(pageSrc).toContain('if (!setData || answers.length === 0) return;');
  });

  it('โหมดพรีวิวของแอดมินไม่ใช้ค่าที่จำไว้', () => {
    expect(pageSrc).toContain('if (previewMode || isNaN(setId)) return;');
  });
});
