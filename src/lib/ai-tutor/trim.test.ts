/**
 * ตัดคำตอบที่ถูกตัด (finish_reason = length) ให้เหลือประโยคสมบูรณ์สุดท้าย
 */
import { describe, expect, it } from 'vitest';

import { trimToLastCompleteSentence } from './trim';

describe('trimToLastCompleteSentence', () => {
  it('ตัดที่จุดจบประโยคอังกฤษท้ายสุด', () => {
    const result = trimToLastCompleteSentence('This is fine. But this part is cut off');
    expect(result.trimmed).toBe(true);
    expect(result.cutReason).toBe('sentence');
    expect(result.text).toBe('This is fine.');
  });

  it('ตัดที่เครื่องหมายจบประโยคไทย (ๆ / ฯ)', () => {
    const result = trimToLastCompleteSentence('เขาเดินไปโรงเรียนแล้วฯ แต่ยังไม่ได้กลับบ้านเลย เธอก็ยิ้ม');
    expect(result.trimmed).toBe(true);
    expect(result.cutReason).toBe('sentence');
    expect(result.text).toBe('เขาเดินไปโรงเรียนแล้วฯ');
  });

  it('ประโยคไทยไม่มีจุด → ตัดที่คำลงท้ายของวลี', () => {
    const result = trimToLastCompleteSentence('เพราะ do เป็นกริยาช่อง 1 เสมอ เธอก็เลยใส่เป็นรูปอดีต');
    expect(result.trimmed).toBe(true);
    expect(result.cutReason).toBe('clause');
    expect(result.text).toContain('เสมอ');
    expect(result.text).not.toContain('เธอก็เลยใส่');
  });

  it('ไม่มีจุดตัดเลย → เก็บทั้งก้อน (ไม่ตัดทิ้งเนื้อหา)', () => {
    const result = trimToLastCompleteSentence('ข้อความที่ยังไม่จบและไม่มีจุดตัดเลย');
    expect(result.trimmed).toBe(false);
    expect(result.cutReason).toBe('none');
    expect(result.text).toBe('ข้อความที่ยังไม่จบและไม่มีจุดตัดเลย');
  });

  it('ตัดที่ขอบเขตบรรทัดเมื่อไม่มีทั้งจุดและคำลงท้าย', () => {
    const result = trimToLastCompleteSentence('บรรทัดแรกที่จบแล้ว\nบรรทัดที่สองยังไม่จบ');
    expect(result.trimmed).toBe(true);
    expect(['line', 'clause']).toContain(result.cutReason);
    expect(result.text).toBe('บรรทัดแรกที่จบแล้ว');
  });

  it('ข้อความที่จบสมบูรณ์อยู่แล้ว → ไม่ตัด', () => {
    const result = trimToLastCompleteSentence('คำตอบที่จบประโยคแล้ว.');
    expect(result.trimmed).toBe(false);
    expect(result.text).toBe('คำตอบที่จบประโยคแล้ว.');
  });

  it('ข้อความว่าง → ไม่พัง', () => {
    const result = trimToLastCompleteSentence('');
    expect(result.trimmed).toBe(false);
    expect(result.text).toBe('');
  });

  it('ตัวหนาที่ถูกตัดกลางทาง → เอา ** ค้างออก ไม่ทิ้งเครื่องหมายค้าง', () => {
    const result = trimToLastCompleteSentence('คำตอบ **ข้อความสำคัญที่โมเดลตัดกลาง');
    expect(result.text).not.toContain('**');
    expect(result.text).toContain('คำตอบ');
  });

  it('ตัวหนาที่ปิดครบแล้วไม่ถูกแตะ', () => {
    const result = trimToLastCompleteSentence('คำตอบ **สำคัญ** จบแล้ว ท้ายที่ถูกตัด');
    expect(result.text).toContain('**สำคัญ**');
    expect(result.text.match(/\*\*/g)?.length).toBe(2);
  });

  it('ข้อความไทยจริงที่ถูกตัด: ตัดที่คำลงท้ายวลี แล้วตัวหนาต้องครบ', () => {
    const result = trimToLastCompleteSentence(
      'เพราะ do เป็นกริยาช่อง 1 **เสมอ** ตามหลักการ เธอก็เลยใส่เป็นรูปอดีต',
    );
    expect(result.trimmed).toBe(true);
    expect(result.cutReason).toBe('clause');
    expect(result.text).toContain('**เสมอ**');
    expect(result.text.match(/\*\*/g)?.length).toBe(2);
    expect(result.text).not.toContain('เธอก็เลยใส่');
  });

  it('ข้อความไทยจริงที่ถูกตัด: "ก็" ไม่ใช่จุดตัด (อยู่กลางประโยค)', () => {
    const result = trimToLastCompleteSentence('คำตอบที่ยังไม่จบเลย ก็ยังไม่จบ');
    // จุดตัดคือ "เลย" (ท้ายวลี) ไม่ใช่ "ก็" ที่อยู่กลางประโยค
    expect(result.cutReason).toBe('clause');
    expect(result.text).toBe('คำตอบที่ยังไม่จบเลย');
    expect(result.text).not.toContain('ก็');
  });
});
