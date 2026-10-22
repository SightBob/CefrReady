/**
 * ตัวกรองรายการคำถามของผู้เรียนในหน้า admin — parse จาก query string
 *
 * ค่าผิดทุกตัวต้อง fallback ไปค่าเริ่มต้น (ไม่ error) และต้องกันโควตาไม่ให้หลุด
 */
import { describe, expect, it } from 'vitest';

import {
  ADMIN_MESSAGE_MAX_DAYS,
  ADMIN_MESSAGE_PAGE_SIZE,
  parseAiTutorMessageFilters,
} from './admin-message-filters';

function parse(query: string) {
  return parseAiTutorMessageFilters(new URLSearchParams(query));
}

describe('parseAiTutorMessageFilters', () => {
  it('ค่าเริ่มต้ม = 30 วัน · คำถามผู้เรียน · ทุกสถานะ · รวมแถวที่เก็บถัง', () => {
    const filters = parse('');
    expect(filters.days).toBe(30);
    expect(filters.role).toBe('user');
    expect(filters.status).toBe('all');
    expect(filters.questionId).toBeNull();
    expect(filters.search).toBeNull();
    expect(filters.includeArchived).toBe(true);
    expect(filters.page).toBe(1);
    expect(filters.pageSize).toBe(ADMIN_MESSAGE_PAGE_SIZE);
  });

  it('อ่านค่าที่ถูกต้องได้ครบ', () => {
    const filters = parse('?days=7&role=assistant&status=failed&questionId=42&q=some&page=3&includeArchived=0');
    expect(filters.days).toBe(7);
    expect(filters.role).toBe('assistant');
    expect(filters.status).toBe('failed');
    expect(filters.questionId).toBe(42);
    expect(filters.search).toBe('some');
    expect(filters.page).toBe(3);
    expect(filters.includeArchived).toBe(false);
  });

  it('ค่าผิด → fallback เป็นค่าเริ่มต้ม (ไม่ throw)', () => {
    const filters = parse('?days=abc&role=hacker&status=???&questionId=-5&page=-1');
    expect(filters.days).toBe(30);
    expect(filters.role).toBe('user');
    expect(filters.status).toBe('all');
    expect(filters.questionId).toBeNull();
    expect(filters.page).toBe(1);
  });

  it('จำกัดช่วงเวลาไม่เกิน 365 วัน (กันลากข้อมูลทั้งประวัติ)', () => {
    expect(parse('?days=9999').days).toBe(ADMIN_MESSAGE_MAX_DAYS);
    expect(parse('?days=0').days).toBe(30);
  });

  it('ตัด % และ _ ออกจากคำค้น (ไม่ให้กลายเป็น wildcard ของ SQL)', () => {
    // %25 ใน query string = อักขระ % จริง → ต้องถูกตัดทิ้ง
    const filters = parse('?q=50%25_off');
    expect(filters.search).toBe('50off');
    expect(filters.search).not.toContain('%');
    expect(filters.search).not.toContain('_');
  });

  it('คำค้นยาวเกิน → ตัดให้สั้น (ไม่เกิน 100 ตัว)', () => {
    const filters = parse(`?q=${'a'.repeat(500)}`);
    expect(filters.search).toHaveLength(100);
  });

  it('คำค้นว่าง → ไม่กรอง (null)', () => {
    expect(parse('?q=').search).toBeNull();
    expect(parse('?q=%20%20').search).toBeNull();
  });

  it('จำกัดหน้าไม่เกิน 500 (กัน offset แรงเกินไป)', () => {
    expect(parse('?page=99999').page).toBe(500);
  });
});
