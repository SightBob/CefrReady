/**
 * กันถอยหลัง: หน้าผลสอบ Full Test ต้องประกาศ title ของตัวเอง
 *
 * อาการจริงบน production: `/tests/full/results` ให้ <title>ข้อสอบ CEFR | CEFR Ready | CEFR Ready</title>
 * เพราะหน้าลูกเป็น client component ไม่มี metadata → สืบทอด default ของ /tests
 * ที่มี "| CEFR Ready" อยู่แล้ว แล้ว root template ต่อท้ายซ้ำอีกครั้ง
 */
import { describe, expect, it } from 'vitest';
import { metadata } from './layout';

describe('metadata หน้าผลสอบ Full Test', () => {
  it('ประกาศ title ของตัวเอง (ไม่ให้ template ต่อท้ายซ้ำ)', () => {
    expect(metadata.title).toBe('ผลการสอบ');
    expect(String(metadata.title)).not.toContain('| CEFR Ready');
  });

  it('ผลสอบเป็นข้อมูลส่วนตัว → ไม่จัดอินเด็กซ์', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
