/**
 * กันถอยหลัง: หลังส่งข้อสอบแล้วต้องไม่มี draft ถูกสร้าง/ค้างอีก
 *
 * อาการจริงที่เจอตอนทดสอบบน production:
 *   ส่งข้อสอบ Listening เสร็จ (5/5) → เปิดแท็บใหม่ → ระบบกู้คืนชุดที่ "ส่งแล้ว"
 *   กลับมาทั้ง 5 คำตอบ พร้อม toast "ทำต่อจากครั้งก่อนแล้ว"
 *
 * สาเหตุ: timer debounce ของ pusher ที่ค้างอยู่ยิง PUT ต่อหลัง submit,
 * แล้ว effect push ยังทำงานได้เพราะไม่รู้ว่าจบรอบแล้ว
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

describe('draft หลังส่งข้อสอบ', () => {
  it('ส่งสำเร็จ → หยุด pusher และล้าง draft ในฐานข้อมูล', () => {
    expect(pageSrc).toContain('void clearTestDraft(sectionId, setId);');
    // ต้องอยู่ในบล็อก success ของ submit (หลัง setIsFinished(true))
    const finishedIndex = pageSrc.indexOf('setIsFinished(true);');
    const clearIndex = pageSrc.indexOf('void clearTestDraft(sectionId, setId);');
    expect(finishedIndex).toBeGreaterThan(-1);
    expect(clearIndex).toBeGreaterThan(finishedIndex);
    expect(pageSrc).toContain('draftPusher.current?.dispose();');
  });

  it('effect ที่ push draft ต้องหยุดเมื่อจบรอบ', () => {
    expect(pageSrc).toContain('// ส่งข้อสอบแล้ว = จบรอบ ห้าม push draft ใหม่กลับไป');
    expect(pageSrc).toMatch(/if \(isFinished\) return;/);
    expect(pageSrc).toContain('[draftHydrated, isFinished, answers, checkedSlots');
  });
});
