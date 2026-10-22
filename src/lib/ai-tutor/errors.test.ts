/**
 * ตัวช่วย error ของ AI Tutor — การ redact + ข้อความกลาง ๆ ให้ผู้เรียน
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AI_TUTOR_LEARNER_ERROR_MESSAGES,
  aiTutorLearnerErrorMessage,
  describeError,
  localizedRateLimitError,
  warnWithSummary,
} from './errors';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('describeError — สรุป error แบบปลอดภัย', () => {
  it('เก็บเฉพาะ message + code', () => {
    const error = Object.assign(new Error('relation does not exist'), { code: '42P01' });
    expect(describeError(error)).toEqual({ message: 'relation does not exist', code: '42P01' });
  });

  it('error ที่ไม่มี code → code = null', () => {
    expect(describeError(new Error('boom'))).toEqual({ message: 'boom', code: null });
  });

  it('ตัด connection string ที่มี user:password ออกจากข้อความ', () => {
    const error = new Error('failed to connect postgres://owner:sup3r-secret@db.internal:5432/app');
    const summary = describeError(error);
    expect(summary.message).not.toContain('sup3r-secret');
    expect(summary.message).toContain('***@');
  });

  it('ตัดทุกรูปแบบของ DSN (postgres/postgresql/http)', () => {
    for (const dsn of [
      'postgres://u:pw@host:5432/db',
      'postgresql://u:pw@host/db',
      'https://user:pw@example.com/path',
    ]) {
      const summary = describeError(new Error(`connect ${dsn} failed`));
      expect(summary.message, dsn).not.toContain('pw@');
      expect(summary.message, dsn).toContain('***@');
    }
  });

  it('ตัดความยาวข้อความไม่ให้เกิน 300 ตัวอักษร', () => {
    const summary = describeError(new Error('x'.repeat(1000)));
    expect(summary.message.length).toBeLessThanOrEqual(300);
  });

  it('ไม่ใช่ Error → ยังคืนข้อความที่อ่านได้ (ไม่ throw)', () => {
    expect(describeError('สตริงธรรมดา')).toEqual({ message: 'สตริงธรรมดา', code: null });
    expect(describeError(undefined)).toEqual({ message: 'unknown error', code: null });
    expect(describeError(123)).toEqual({ message: 'unknown error', code: null });
  });

  it('error ที่ไม่มี message → ใช้ชื่อคลาสแทน', () => {
    expect(describeError(new Error('')).message).toBe('Error');
  });

  it('DrizzleQueryError → ตัด "params" ทิ้ง (params อาจเป็นอีเมล/คำถามของผู้เรียน)', () => {
    const drizzleError = Object.assign(
      new Error('Failed query: insert into "ai_tutor_messages" ("user_id","content") values ($1, $2)\nparams: u-1, learner@example.com'),
      { name: 'DrizzleQueryError', code: '23505' },
    );
    const summary = describeError(drizzleError);
    expect(summary.message).not.toContain('learner@example.com');
    expect(summary.message).not.toContain('params:');
    expect(summary.message).toContain('DrizzleQueryError');
    expect(summary.code).toBe('23505');
  });

  it('ข้อความหลายบรรทัด → เก็บแค่บรรทัดแรก (ไม่ดึงข้อมูลจากบรรทัดถัดไป)', () => {
    const summary = describeError(new Error('เกิดข้อผิดพลาด\nบรรทัดที่สอง: proof-token-abc123'));
    expect(summary.message).toBe('เกิดข้อผิดพลาด');
    expect(summary.message).not.toContain('proof-token-abc123');
  });
});

describe('warnWithSummary — log เฉพาะ message + code', () => {
  it('พิมพ์เป็น string เดียว ไม่พิมพ์ error object ทั้งก้อน', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = Object.assign(new Error('boom'), { code: '42P01', secret: 'ไม่ควรโผล่' });

    warnWithSummary('ai-tutor] ทดสอบ', error);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].length).toBe(1);
    const logged = warn.mock.calls[0][0] as string;
    expect(typeof logged).toBe('string');
    expect(logged).toContain('boom');
    expect(logged).toContain('42P01');
    expect(logged).not.toContain('ไม่ควรโผล่');
  });

  it('ตัด connection string ก่อน log', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnWithSummary('ai-tutor] ทดสอบ', new Error('postgres://u:sup3r-secret@h/db'));
    const logged = warn.mock.calls[0][0] as string;
    expect(logged).not.toContain('sup3r-secret');
  });

  it('log ที่ถูกเรียกไม่มีอีเมล/คำถามของผู้เรียนที่อยู่ใน params ของ query', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const drizzleError = Object.assign(
      new Error('Failed query: select ... where "email" = $1\nparams: learner@example.com'),
      { name: 'DrizzleQueryError', code: '23505' },
    );

    warnWithSummary('ai-tutor] ทดสอบ', drizzleError);

    const logged = warn.mock.calls[0][0] as string;
    expect(logged).not.toContain('learner@example.com');
    expect(logged).toContain('DrizzleQueryError');
    expect(logged).toContain('23505');
  });
});

describe('localizedRateLimitError — 429 + Retry-After + ข้อความไทย', () => {
  it('คงสถานะ 429 และ Retry-After จากระบบ rate limit', async () => {
    const original = new Response('{}', { status: 429, headers: { 'Retry-After': '42' } });
    const response = localizedRateLimitError(original, 'ถี่เกินไป');
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('42');
    await expect(response.json()).resolves.toEqual({ success: false, error: 'ถี่เกินไป' });
  });

  it('ไม่มี Retry-After → ใช้ค่าเริ่มต้น 60', () => {
    const response = localizedRateLimitError(new Response('{}', { status: 429 }), 'ถี่เกินไป');
    expect(response.headers.get('Retry-After')).toBe('60');
  });
});

describe('aiTutorLearnerErrorMessage — ข้อความกลางๆ ตามประเภทความล้มเหลว', () => {
  it('ทุกประเภทมีข้อความของตัวเอง (ไม่ซ้ำกัน — ยกเว้น timeout กับ first-token-timeout ที่ตั้งใจให้เหมือนกัน)', () => {
    const messages = Object.values(AI_TUTOR_LEARNER_ERROR_MESSAGES);
    expect(messages.every((message) => message.length > 0)).toBe(true);

    // timeout กับ first-token-timeout = ผู้เรียนเจอเหมือนกัน (ใช้เวลานานเกินไป)
    expect(AI_TUTOR_LEARNER_ERROR_MESSAGES.timeout).toBe(AI_TUTOR_LEARNER_ERROR_MESSAGES['first-token-timeout']);

    const distinct = new Set(messages);
    // 8 ข้อความ แต่ timeout กับ first-token-timeout ใช้ข้อความเดียวกัน → unique = 7
    expect(distinct.size).toBe(messages.length - 1);
  });

  it('ไม่มี reason → ข้อความกลางๆ ทั่วไป', () => {
    expect(aiTutorLearnerErrorMessage()).toBe(AI_TUTOR_LEARNER_ERROR_MESSAGES.unknown);
    expect(aiTutorLearnerErrorMessage(null)).toBe(AI_TUTOR_LEARNER_ERROR_MESSAGES.unknown);
  });

  it('reason ที่รู้จัก → ข้อความเฉพาะของมัน', () => {
    expect(aiTutorLearnerErrorMessage('rate-limit')).toBe(AI_TUTOR_LEARNER_ERROR_MESSAGES['rate-limit']);
    expect(aiTutorLearnerErrorMessage('timeout')).toBe(AI_TUTOR_LEARNER_ERROR_MESSAGES.timeout);
    expect(aiTutorLearnerErrorMessage('config')).toBe(AI_TUTOR_LEARNER_ERROR_MESSAGES.config);
  });

  it('ไม่มีข้อความที่เผยชื่อผู้ให้บริการ/คีย์/รายละเอียดภายใน', () => {
    for (const message of Object.values(AI_TUTOR_LEARNER_ERROR_MESSAGES)) {
      expect(message).not.toContain('OpenRouter');
      expect(message).not.toContain('API key');
      expect(message).not.toContain('sk-or');
      expect(message).not.toMatch(/\b4\d\d\b/); // ไม่มี status code ของ provider
    }
  });
});
