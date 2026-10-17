/**
 * CefrLevelBanner เคยมีตาราง threshold ของตัวเอง (CEFR_THRESHOLDS) แยกจาก
 * src/lib/cefr-estimator.ts — ค่าตรงกันตอนนี้แต่เป็นคนละชุด ถ้าแก้ที่เดียว
 * อีกฝั่งจะเงียบ ๆ ขัดกัน
 *
 * ทดสอบว่า (1) banner ดึงขอบเขตจาก lib และ (2) ค่าที่แสดงยังเหมือนเดิมทุกค่า
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import CefrLevelBanner from './CefrLevelBanner';
import { CEFR_MIN_SCORES, estimateCefrLevel } from '@/lib/cefr-estimator';
import type { CefrLevel } from '@/lib/cefr-estimator';

const ORDER: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function render(level: CefrLevel, averageScore: number) {
  return renderToStaticMarkup(<CefrLevelBanner level={level} averageScore={averageScore} />);
}

describe('CefrLevelBanner — ขอบเขตมาจาก lib ไม่ใช่ตารางในไฟล์', () => {
  it('ไม่มีตาราง threshold ประจำตัวในไฟล์แล้ว', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/CefrLevelBanner.tsx'), 'utf8');
    expect(src).not.toContain('CEFR_THRESHOLDS');
    expect(src).toContain("from '@/lib/cefr-estimator'");
  });

  it('แสดง "ต้องการ X%" เป็นคะแนนต่ำสุดของระดับถัดไปตาม lib', () => {
    // ทุกระดับ (ยกเว้น C2 ที่ไม่มีระดับถัดไป)
    const expected = [
      ['A1', 38], ['A2', 52], ['B1', 65], ['B2', 78], ['C1', 90],
    ] as const;
    for (const [level, minNext] of expected) {
      expect(render(level, minNext)).toContain(`ต้องการ ${minNext}%`);
    }
    // ค่าที่แสดงต้องมาจาก lib ไม่ใช่ตัวเลขที่เขียนค้างในไฟล์
    expect(render('B1', 60)).toContain(`ต้องการ ${CEFR_MIN_SCORES.B2}%`);
  });

  it('C2 แสดงข้อความถึงระดับสูงสุด ไม่มีเป้าหมายถัดไป', () => {
    const html = render('C2', 95);
    expect(html).toContain('ถึงระดับสูงสุดแล้ว');
    expect(html).not.toContain('ต้องการ');
  });
});

describe('เส้นแบ่งระดับที่ขอบแต่ละช่วง — lib ตัวเดียวกัน', () => {
  it('ทุกขอบให้ระดับถัดไปทันที', () => {
    // 37/38, 51/52, 64/65, 77/78, 89/90
    expect(estimateCefrLevel(37)).toBe('A1');
    expect(estimateCefrLevel(38)).toBe('A2');
    expect(estimateCefrLevel(51)).toBe('A2');
    expect(estimateCefrLevel(52)).toBe('B1');
    expect(estimateCefrLevel(64)).toBe('B1');
    expect(estimateCefrLevel(65)).toBe('B2');
    expect(estimateCefrLevel(77)).toBe('B2');
    expect(estimateCefrLevel(78)).toBe('C1');
    expect(estimateCefrLevel(89)).toBe('C1');
    expect(estimateCefrLevel(90)).toBe('C2');
  });

  it('ขอบใน CEFR_MIN_SCORES ตรงกับผลของ estimateCefrLevel ทุกค่า', () => {
    for (let i = 1; i < ORDER.length; i++) {
      const level = ORDER[i];
      const min = CEFR_MIN_SCORES[level];
      expect(estimateCefrLevel(min)).toBe(level);
      expect(estimateCefrLevel(min - 1)).toBe(ORDER[i - 1]);
    }
  });
});