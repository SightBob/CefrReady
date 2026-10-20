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
  const real = renderToStaticMarkup(<AiTutorPanel introMessage={explanation} />);

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
    expect(real).toContain('h-[573px] w-[788px]');
    expect(real).toContain('border-[#e9cd62]');
    expect(real).toContain('h-[379px]');
  });
});
