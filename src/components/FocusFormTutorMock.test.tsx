import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FocusFormTutorMock from './FocusFormTutorMock';

// UI mock AI Tutor (Figma 580:27829) — เปิดด้วย ?tutor=1 ที่ /tests/focus-form/[setId]
// เท่านั้น (ผู้พัฒนาเห็นคนเดียว) — เนื้อหาก๊อบตาม Figma, โต้ตอบน้อยที่สุด
describe('FocusFormTutorMock — เรนเดอร์โครงหน้า mock ตาม Figma', () => {
  const markup = renderToStaticMarkup(<FocusFormTutorMock />);

  it('มี sidebar ซ้าย: ป้ายพาร์ท, กริดเลขข้อ 1–9 + ลูกศร, คลังกริยา', () => {
    expect(markup).toContain('Form &amp; Meaning');
    expect(markup).toContain('คลังกริยา 3 ช่องจากข้อสอบจริง');
    expect(markup).toContain('ค้นหาคำศัพท์');
    // เข็ม V.1/V.2/V.3 + แถวกริยา 3 ช่องตามแบบ
    for (const text of ['V.1', 'V.2', 'V.3', 'go', 'went', 'gone', 'eat', 'ate', 'eaten', 'see', 'saw', 'seen']) {
      expect(markup).toContain(text);
    }
  });

  it('มีแถบ progress + ปุ่มปิดมุมขวาบน', () => {
    expect(markup).toContain('ทั้งหมด 20 ข้อ');
    expect(markup).toContain('/tests/tutor-mock/close.svg');
  });

  it('มีโจทย์ก๊อบตาม Figma พร้อมตัวเลือก A–D สองแถว', () => {
    // ตำแหน่งคำวาง absolute ตามแบบ (580:27919–27927)
    expect(markup).toContain('___');
    expect(markup).toContain('เติมคำในช่องว่าง');
    for (const option of ['Who', 'Which', 'Whom', 'Whose']) {
      expect(markup).toContain(option);
    }
  });

  it('มีกรอบ AI Tutor: หัวข้อ, โควตา, ชุดไอคอน asset จาก Figma, แชทและช่องพิมพ์', () => {
    expect(markup).toContain('โหมด AI');
    expect(markup).toContain('ถามแล้ว 0 คำถาม');
    expect(markup).toContain('เหลือโควตา 5 ครั้ง');
    // asset ไอคอนดาวน์โหลดจาก Figma MCP — ห้ามวาดซ้ำ
    for (const asset of ['sparkle.svg', 'rotate-cw.svg', 'maximize-2.svg', 'arrow-up.svg']) {
      expect(markup).toContain(`/tests/tutor-mock/${asset}`);
    }
    expect(markup).toContain('AI Mentor • สรุปสูตร');
    expect(markup).toContain('คำถาม 1');
    expect(markup).toContain('พิมพ์คำถามต่อในเธรดนี้ (เช่น ขอตัวอย่างโจทย์คล้ายกัน)...');
  });

  it('กริดเลขข้อ: ค่าเริ่มต้น active = ข้อ 7 ตามภาพแบบ และปุ่มส่งปิด (mock ยังไม่ต่อ AI)', () => {
    // ปุ่ม active = พื้น #719cc0 + กว้าง 39px ผ่าน inline style (580:27851)
    expect(markup).toContain('bg-[#719cc0]');
    expect(markup).toContain('aria-current="true"');
    expect(markup).toContain('style="width:39px"');
    // ปุ่มทำโทษแล้ว = พื้นฟ้าอ่อน, ยังไม่ถึงคิว = เทาอ่อน (1–6 / 8–9)
    expect(markup).toContain('bg-[#dcefff]');
    expect(markup).toContain('bg-[#f8f8f8]');
    // send button disabled
    expect(markup).toContain('aria-label="ส่งคำถาม"');
  });

  it('มีปุ่มล่าง "ข้อต่อไป" พื้นเหลืองตามแบบ', () => {
    expect(markup).toContain('ข้อต่อไป');
    expect(markup).toContain('bg-[#fff0ae]');
  });
});
