import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { countableAnswerFilter } from './question-stats';

const dialect = new PgDialect();

describe('countableAnswerFilter', () => {
  it('นับเฉพาะคำตอบที่ส่งหลัง stats_cutoff_at และยังนับทุกคำตอบเมื่อ cutoff เป็น NULL', () => {
    const { sql: text, params } = dialect.sqlToQuery(countableAnswerFilter());

    // ตัดด้วยเวลาตอบ เทียบ cutoff ต่อข้อ
    expect(text).toContain('"user_answers"."created_at"');
    expect(text).toContain('"questions"."stats_cutoff_at"');
    expect(text).toContain('>=');
    // NULL = ยังไม่เคยรีเซ็ต → -infinity ทำให้ทุกแถวผ่านเงื่อนไข
    expect(text).toContain('coalesce');
    expect(text).toContain("'-infinity'::timestamptz");
    expect(params).toEqual([]);
  });
});
