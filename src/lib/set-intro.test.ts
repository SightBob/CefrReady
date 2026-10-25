import { describe, expect, it } from 'vitest';

import { topicsWithExplain } from './set-intro';

/**
 * หน้าข้อสอบใช้ค่านี้ตัดสินว่าจะพาไปหน้า /explain ของชุดหรือไม่
 * (ผู้ใช้รายงาน 2026-10-25: เดิมรีเฟรชแล้วมีหน้าเนื้อหาอธิบายเด้งซ้อนกันหลายอัน
 *  เพราะใส่ทุกเรื่องลงคิว — ปิดอันหนึ่งแล้วขึ้นอันถัดไป)
 */
describe('topicsWithExplain', () => {
  const explains = {
    'Present Simple': { id: 1 },
    'Present Continuous': { id: 2 },
  };

  it('คืนทุกเรื่องที่มีเนื้อหาอธิบาย ตามลำดับข้อสอบ', () => {
    expect(
      topicsWithExplain(
        [{ topic: 'Present Simple' }, { topic: 'Present Continuous' }],
        explains,
      ),
    ).toEqual(['Present Simple', 'Present Continuous']);
  });

  it('ข้ามเรื่องที่ไม่มีเนื้อหาอธิบาย', () => {
    expect(
      topicsWithExplain(
        [{ topic: 'ไม่มีในระบบ' }, { topic: 'Present Continuous' }],
        explains,
      ),
    ).toEqual(['Present Continuous']);
  });

  it('เรื่องซ้ำ (แม้ไม่ติดกัน) นับครั้งเดียว', () => {
    expect(
      topicsWithExplain(
        [
          { topic: 'Present Simple' },
          { topic: 'Present Continuous' },
          { topic: 'Present Simple' },
        ],
        explains,
      ),
    ).toEqual(['Present Simple', 'Present Continuous']);
  });

  it('topic ว่าง/ไม่มีค่า ถูกข้าม', () => {
    expect(
      topicsWithExplain([{ topic: '' }, { topic: null }, {}, { topic: '  Present Simple  ' }], explains),
    ).toEqual(['Present Simple']);
  });

  it('ชุดที่ไม่มีเนื้อหาอธิบายเลย → คืนลิสต์ว่าง (ไม่เด้งไป /explain)', () => {
    expect(topicsWithExplain([{ topic: 'ไม่รู้จัก' }], explains)).toEqual([]);
  });
});
