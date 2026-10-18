/**
 * ดัชนีบน test_set_questions ต้องตรงกับ DB จริง
 *
 * DB สร้าง tsq_unique ด้วย CREATE UNIQUE INDEX (ดู scripts/migrate-test-sets.ts)
 * แต่ schema.ts ประกาศด้วย index() ซึ่งเป็น plain index — ชื่อขัดกับความจริง
 * และ drizzle-kit จะเสนอ migration ที่ DROP ดัชนีที่มีอยู่จริง
 */
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';

import { testSetQuestions } from './schema';

const indexes = getTableConfig(testSetQuestions).indexes;
const byName = new Map(indexes.map((idx) => [idx.config.name, idx]));

describe('test_set_questions indexes', () => {
  it('tsq_unique บน (test_set_id, question_id) ต้องเป็น unique', () => {
    const idx = byName.get('tsq_unique');
    expect(idx, 'tsq_unique ไม่มีใน schema').toBeDefined();
    expect(idx?.config.unique, 'tsq_unique ต้องเป็น uniqueIndex ไม่ใช่ index').toBe(true);
  });

  it('tsq_set_order_unique บน (test_set_id, order_index) ต้องเป็น unique', () => {
    const idx = byName.get('tsq_set_order_unique');
    expect(idx, 'tsq_set_order_unique ไม่มีใน schema').toBeDefined();
    expect(idx?.config.unique).toBe(true);
  });

  it('tsq_set_idx ยังเป็น plain index', () => {
    const idx = byName.get('tsq_set_idx');
    expect(idx).toBeDefined();
    expect(idx?.config.unique ?? false).toBe(false);
  });
});