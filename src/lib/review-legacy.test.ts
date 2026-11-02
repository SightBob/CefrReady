import { describe, expect, it } from 'vitest';
import { isQuestionChangedSinceAttempt } from './review-legacy';

describe('isQuestionChangedSinceAttempt', () => {
  it('เป็น true เมื่อโจทย์ถูกแก้หลังผู้เรียนส่งคำตอบ', () => {
    expect(
      isQuestionChangedSinceAttempt(
        '2026-11-02T11:19:14.023Z',
        '2026-08-08T09:19:20.275Z',
      ),
    ).toBe(true);
  });

  it('เป็น false เมื่อโจทย์ยังไม่ถูกแก้หลังทำข้อสอบ', () => {
    expect(
      isQuestionChangedSinceAttempt(
        '2026-08-01T10:00:00.000Z',
        '2026-08-08T09:19:20.275Z',
      ),
    ).toBe(false);
  });

  it('เวลาเท่ากันถือว่าไม่เปลี่ยน', () => {
    expect(
      isQuestionChangedSinceAttempt(
        '2026-08-08T09:19:20.275Z',
        '2026-08-08T09:19:20.275Z',
      ),
    ).toBe(false);
  });

  it('เป็น false เมื่อไม่มีค่าเวลา (attempt ยังไม่จบ / ไม่มี updated_at)', () => {
    expect(isQuestionChangedSinceAttempt(null, '2026-08-08T09:19:20.275Z')).toBe(false);
    expect(isQuestionChangedSinceAttempt('2026-11-02T11:19:14.023Z', null)).toBe(false);
    expect(isQuestionChangedSinceAttempt(undefined, undefined)).toBe(false);
  });

  it('เป็น false เมื่อค่าเวลา parse ไม่ได้', () => {
    expect(isQuestionChangedSinceAttempt('not-a-date', '2026-08-08T09:19:20.275Z')).toBe(false);
    expect(isQuestionChangedSinceAttempt('2026-11-02T11:19:14.023Z', 'invalid')).toBe(false);
  });

  it('รับ Date object ได้', () => {
    expect(
      isQuestionChangedSinceAttempt(
        new Date('2026-11-02T11:19:14.023Z'),
        new Date('2026-08-08T09:19:20.275Z'),
      ),
    ).toBe(true);
  });
});
