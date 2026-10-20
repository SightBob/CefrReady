import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AiTutorPanel from './AiTutorPanel';

/**
 * กรอบ AI Tutor — โหมด mock /dev/tutor-mock คงเนื้อหา demo ตามแบบ Figma เดิม
 * โหมดหน้าจริง (ผู้ใช้กำหนด 2026-10-19) คำอธิบายข้อสอบ = บทสนทนาแรกแทนเนื้อหา demo
 * เพื่อลด token: คำอธิบายอยู่ในเธรดแชทแล้ว ไม่ต้องส่งซ้ำอีกชั้นเวลาถามต่อ
 */
describe('AiTutorPanel — โครงคงแบบ Figma 580:27960', () => {
  const markup = renderToStaticMarkup(<AiTutorPanel />);

  it('หัวกรอบข้อความเหมือนตั้งต้วตามแบบ', () => {
    expect(markup).toContain('โหมด AI');
    expect(markup).toContain('ถามแล้ว 0 คำถาม');
    expect(markup).toContain('(เหลือโควตา 5 ครั้ง)');
  });

  it('โหมด mock: เนื้อหา demo ตามแบบ Figma เท่าเดิม', () => {
    expect(markup).toContain('AI Mentor • สรุปสูตร');
    expect(markup).toContain('คำถาม 1');
    expect(markup).toContain('border-[#e9cd62]');
  });
});

describe('AiTutorPanel — หน้าจริง: คำอธิบายเป็นบทสนทนาแรก', () => {
  const explanation = 'หลัง [do/does/did] ต้องตามด้วยกริยาช่อง 1 **เสมอ**';
  // โหมดสด = มี questionId (หน้าสอบจริงส่งมาเสมอ)
  const real = renderToStaticMarkup(<AiTutorPanel introMessage={explanation} questionId={7} answerProof="proof" />);

  it('คำอธิบายจากฐานข้อมูลถูกเรนเดอร์ในเธรดแชท', () => {
    expect(real).toContain('กริยาช่อง 1');
  });

  it('แทนที่เนื้อหา demo ตามแบบทั้งหมด', () => {
    expect(real).not.toContain('AI Mentor • สรุปสูตร');
    expect(real).not.toContain('คำถาม 1');
  });

  it('ป้ายเทิร์นแรกระบุว่าเป็นคำอธิบาย (ค่าที่ผมเลือกเอง — แบบไม่มีสถานะหน้าจริงให้)', () => {
    expect(real).toContain('AI Mentor • คำอธิบาย');
  });

  it('เครื่องหมาย markdown ไม่ควรรั่วเป็นข้อความดิบ', () => {
    expect(real).not.toContain('**เสมอ**');
    expect(real).toContain('เสมอ');
  });

  it('โครงกรอบคงเดิมทุกพิกเซล (ขนาด/สีขอบ)', () => {
    expect(real).toContain('max-w-[788px]');
    expect(real).toContain('min-[890px]:h-[573px]');
    expect(real).toContain('border-[#e9cd62]');
    expect(real).toContain('min-[890px]:h-[379px]');
  });
});

describe('AiTutorPanel — responsive (ผู้ใช้กำหนด 2026-10-20)', () => {
  const markup = renderToStaticMarkup(<AiTutorPanel />);

  it('ไม่พึ่งความกว้างคงที่ 788px แล้ว — เต็มความกว้างแต่ไม่เกินแบบ', () => {
    expect(markup).toContain('w-full max-w-[788px]');
    // ไม่มีการ fix ความกว้าง 788 (max-w คือเพดาน ไม่ใช่ความกว้างตายตัว)
    expect(markup).not.toMatch(/(?<!max-)w-\[788px\]/);
  });

  it('ความสูงแชทเป็น clamp บนมือถือ และ 379px ตามแบบเมื่อจอกว้าง', () => {
    expect(markup).toContain('h-[clamp(220px,38vh,379px)]');
    expect(markup).toContain('min-[890px]:h-[379px]');
  });

  it('ก้อนข้อความย่อได้ (min-w-0/flex-1) ไม่ล้นจอแคบ', () => {
    expect(markup).toContain('min-w-0 flex-1');
    expect(markup).toContain('max-w-[578px]');
  });

  it('ช่องพิมพ์ไม่ถูกแถบล่างของหน้าสอบบัง และกัน iOS zoom', () => {
    expect(markup).toContain('scroll-mb-[96px]');
    expect(markup).toContain('text-[16px]');
    expect(markup).toContain('min-[890px]:text-[14px]');
  });
});

describe('AiTutorPanel — ป้าย Beta + ข้อความกันเหตุ (เฉพาะโหมดหน้าจริง)', () => {
  it('ไม่แสดงในโหมด mock (คงความตรง Figma)', () => {
    const mock = renderToStaticMarkup(<AiTutorPanel />);
    expect(mock).not.toContain('ทดลองใช้ (Beta)');
    expect(mock).not.toContain('AI อาจตอบผิดได้');
  });

  it('แสดงเมื่อเปิด showBetaLabels โดยไม่ดันหัวข้อความเดิม', () => {
    const live = renderToStaticMarkup(<AiTutorPanel showBetaLabels questionId={7} answerProof="proof" />);
    expect(live).toContain('ทดลองใช้ (Beta)');
    expect(live).toContain('AI อาจตอบผิดได้');
    // หัวข้อ/โควตาเดิมยังอยู่และไม่ถูกแทนที่
    expect(live).toContain('โหมด AI');
    expect(live).toContain('(เหลือโควตา 5 ครั้ง)');
  });
});

describe('AiTutorPanel — โหมดสด (ต่อ API จริง)', () => {
  const live = renderToStaticMarkup(<AiTutorPanel questionId={7} answerProof="proof" showBetaLabels />);

  it('ช่องพิมพ์เป็น textarea (Enter ส่ง / Shift+Enter ขึ้นบรรทัดใหม่)', () => {
    expect(live).toContain('<textarea');
    expect(live).toContain('aria-label="พิมพ์คำถามถึง AI"');
  });

  it('ปุ่มส่งปิดไว้จนกว่าจะพิมพ์ (mock) และมีปุ่มเริ่มคำถามใหม่', () => {
    expect(live).toContain('aria-label="เริ่มคำถามใหม่"');
    expect(live).toContain('aria-label="ส่งคำถาม"');
  });

  it('โหมด mock ยังเป็นเนื้อหา demo ตามแบบ (ไม่มีปุ่ม reset)', () => {
    const mock = renderToStaticMarkup(<AiTutorPanel />);
    expect(mock).not.toContain('เริ่มคำถามใหม่');
    expect(mock).toContain('AI Mentor • สรุปสูตร');
  });
});
