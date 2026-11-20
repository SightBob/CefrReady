/**
 * test_started ต้องนับเฉพาะ "การเริ่มทำจริง"
 *
 * เดิมหน้านี้ยิง test_started ทุกครั้งที่ชุดข้อสอบโหลดเสร็จ รวมถึงตอนที่หน้า
 * กำลังแสดง "ผลสอบ" ที่กู้คืนมาจาก sessionStorage (กด refresh หลังส่ง หรือ
 * กลับเข้ามาในแท็บเดิม) → อัตราทำจนจบต่ำกว่าความจริง
 * วัดจากข้อมูลจริง: form-meaning มี start 637 ครั้ง แต่ 256 ครั้งเป็นการเปิด
 * มาพบหน้าผลสอบทันที
 *
 * เทสอ่านซอร์สตรง (แนวเดียวกับ page-refresh-state.test.ts) เพราะหน้าเป็น
 * client component ขนาดใหญ่ที่ผูกกับ API หลายตัว
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

/** เฉพาะบล็อก effect ที่ยิง test_started (ไม่รวม test_started ของ "ทำอีกครั้ง") */
const startEffect = pageSrc.slice(
  pageSrc.indexOf('// Track test_started when questions are loaded'),
  pageSrc.indexOf('// test_abandoned'),
);

describe('test_started นับเฉพาะการเริ่มทำจริง', () => {
  it('ข้ามการนับเมื่อหน้านี้แสดงผลสอบที่กู้คืนมาแล้ว', () => {
    expect(startEffect).toContain('loadFinishedTest(sectionId, setId)');
    expect(startEffect).toContain('return;');
  });

  it('เช็กผลสอบก่อน capture (ไม่ใช่หลัง)', () => {
    const guardIdx = startEffect.indexOf('loadFinishedTest(sectionId, setId)');
    const captureIdx = startEffect.indexOf("capture('test_started'");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(captureIdx).toBeGreaterThan(guardIdx);
  });

  it('โหมดพรีวิวของแอดมินยังนับได้ (ไม่มีผลสอบให้กู้คืน)', () => {
    expect(startEffect).toContain('!previewMode');
  });

  it('"ทำอีกครั้ง" ยังนับเป็นรอบใหม่ (ไม่ถูก guard บล็อก)', () => {
    expect(pageSrc).toContain('submittedRef.current = false;');
    expect(pageSrc).toContain('testStartedAtRef.current = Date.now();');
    expect(pageSrc).toContain('retake: true');
  });
});
