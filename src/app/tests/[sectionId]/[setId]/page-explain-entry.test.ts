/**
 * ทางเข้าเนื้อหาอธิบายก่อนทำชุด (ผู้ใช้กำหนด 2026-10-25)
 *
 * - เข้าชุดครั้งแรก (ยังไม่มีความคืบหน้าในเครื่อง) → พาไปหน้า /explain ของชุดนั้น
 * - **refresh แล้วต้องอยู่ข้อเดิม** → ตำแหน่งข้อถูกจำไว้ (test-progress) และเมื่อมี
 *   ความคืบหน้าอยู่แล้วก็ห้ามเด้งออกจากหน้าสอบ
 *
 * ของเดิมเป็น overlay เต็มจอทับหน้าสอบ และใส่ **ทุกเรื่อง** ลงคิว
 * → ปิดอันหนึ่งแล้วเด้งอันถัดไปเรื่อย ๆ = หน้าอธิบายซ้อนกันหลายอัน
 *
 * เทสต์อ่านซอร์สตรง แนวเดียวกับ page-apifetch / page-tutor-flag
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

describe('ทางเข้าเนื้อหาอธิบายก่อนทำชุด', () => {
  it('เข้าครั้งแรก → พาไปหน้า /explain ของชุด แทนการเปิด overlay ทับหน้าสอบ', () => {
    expect(pageSrc).toMatch(
      /router\.replace\(`\/tests\/\$\{sectionId\}\/\$\{setId\}\/explain`\)/,
    );
  });

  it('ไม่เด้งซ้ำเมื่อเริ่มชุดนี้ไปแล้ว (refresh = อยู่ข้อเดิม)', () => {
    expect(pageSrc).toContain('if (hasProgress.current) return;');
  });

  it('บันทึกตำแหน่งข้อก่อนเด้ง — กลับมาจาก /explain แล้วไม่ลูป', () => {
    expect(pageSrc).toContain('saveTestProgress(sectionId, setId, 0)');
  });

  it('ฟื้นตำแหน่งข้อที่ค้างอยู่ตอน mount/เปลี่ยนชุด', () => {
    expect(pageSrc).toContain('loadTestProgress(sectionId, setId)');
    expect(pageSrc).toContain('setCurrentQuestion(saved ?? 0)');
  });

  it('ไม่มีคิว overlay เนื้อหาอธิบายเหลืออยู่ (กันการเด้งซ้อนหลายอัน)', () => {
    expect(pageSrc).not.toContain('introQueue');
    expect(pageSrc).not.toContain('topicGate');
  });

  it('ไม่เด้งในโหมดพรีวิวของแอดมิน', () => {
    expect(pageSrc).toContain('if (previewMode) return;');
  });

  it('ยังเปิดเนื้อหาเดิมซ้ำได้ด้วยปุ่ม "โหมดทบทวน" ตามปกติ', () => {
    expect(pageSrc).toContain('<TestExplainOverlay explain={testExplain} open={showTestExplain}');
  });
});
