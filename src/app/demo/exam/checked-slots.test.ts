import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * บั๊กเดิม: หน้า demo เก็บผลตรวจ (ถูก/ผิด) ไว้ใน state ที่ถูกอ่านว่า "ตรวจแล้วหรือยัง"
 * พอเลือกคำตอบผิด state จึงเป็น false → isSlotChecked ได้ false → ถูกมองว่า
 * "ยังไม่ได้ตรวจ" → ไม่มีเฉลย ข้ามข้อถัดไปไม่ได้ ผู้เรียนต้องเลือกถูกเท่านั้น
 * ถึงจะเดินหน้าได้
 *
 * เทสต์ระดับ source (ไม่ใช้ jsdom) เพราะหน้านี้เป็น client component ที่ต้อง
 * stub fetch + mock next/navigation + รอ dynamic import ของ TestLayout
 * ซึ่งไม่คุ้มกับการเปลี่ยนบรรทัดเดียว และ type Record<number, true> กันบั๊กนี้
 * ได้ในระดับ compile-time อยู่แล้ว
 */
const PAGE = 'src/app/demo/exam/page.tsx';
const source = readFileSync(resolve(PAGE), 'utf8');

describe('demo exam stores "checked", not "correct"', () => {
  it('keeps the check-set typed so it can only ever hold true', () => {
    // Record<number, true> = เก็บได้แค่ true เท่านั้น tsc จะ error ถ้าใครลอง
    // ส่งค่าความหมาย "ผิด" เข้าไปอีก — กันบั๊กนี้ไม่ให้กลับมา
    expect(source).toContain('useState<Record<number, true>>({})');
    expect(source).not.toContain('useState<Record<number, boolean>>({})');
  });

  it('marks a slot as checked regardless of whether the answer is right', () => {
    // เดิม: [..., [currentSlot]: slotIsCorrect(...)]  → ผิดก็เก็บ false
    // ต้องเป็น true ล้วน
    expect(source).toMatch(/setCheckedSlots\(\(prev\) => \(\{ \.\.\.prev, \[currentSlot\]: true \}\)\)/);
    expect(source).not.toMatch(/\[currentSlot\]:\s*slotIsCorrect\(/);
  });

  it('reads the check-set only as presence, never as correctness', () => {
    // isSlotChecked = เช็คว่ามีคีย์หรือยัง ไม่ใช่ค่า true/false
    expect(source).toMatch(/const isSlotChecked = \(index: number\) => checkedSlots\[index\] === true;/);
    // ห้ามอ่าน checkedSlots[..] ที่ไหนนอกจากนี้และบรรทัด lock ของ handleAnswer
    const truthyReads = source.match(/checkedSlots\[currentSlot\](?!\s*===\s*true)/g) ?? [];
    expect(truthyReads).toHaveLength(0);
  });

  it('computes correct/wrong at render time from the learner answer', () => {
    // ต้องคำนวณตอน render ไม่ใช่อ่านจาก state
    expect(source).toMatch(
      /\{slotIsCorrect\(question, activeSlot, selectedAnswer \?\? ''\)/,
    );
    expect(source).not.toContain('checkedSlots[currentSlot] ?');
  });

  it('keeps no other place that counts the check-set as correctness', () => {
    // ไม่มี Object.values / filter(Boolean) / การนับ progress ที่อ่านค่านี้
    expect(source).not.toMatch(/Object\.(values|entries|keys)\(checkedSlots\)/);
    expect(source).not.toMatch(/checkedSlots\)\.filter/);
    // progress นับผ่าน isSlotChecked ทีละ slot
    expect(source).toMatch(/isSlotChecked\(index\) \? count \+ 1 : count/);
  });
});

describe('the answer stays locked after checking so the verdict cannot flip', () => {
  it('ignores new answers once a slot is checked', () => {
    expect(source).toMatch(/if \(checkedSlots\[currentSlot\] === true\) return;/);
  });

  it('locks the Form & Meaning text input after checking', () => {
    expect(source).toMatch(/disabled=\{isSlotChecked\(currentSlot\)\}/);
  });
});
