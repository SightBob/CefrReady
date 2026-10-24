/**
 * ตัวช่วย insert ลง ai_tutor_messages — บังคับ questionId เป็นเลขเสมอ
 *
 * หลัง migration 0050 คอลัมน์ question_id เป็น nullable (ลบข้อสอบแล้ว = NULL)
 * → ถ้าใคร insert โดยไม่ใส่ค่า จะได้แถวที่ไม่ผูกกับข้อสอบตั้งแต่ตอนเขียน
 *   (ไม่ใช่เพราะข้อสอบถูกลบ) → ต้องกันไว้ที่จุดเดียว
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock('@/db', () => ({ db: { insert: mocks.insert } }));

import { AI_TUTOR_QUESTION_ID_REQUIRED_MESSAGE, insertAiTutorMessage } from './messages';

let insertedValues: Record<string, unknown> | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  insertedValues = null;
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn((values: Record<string, unknown>) => {
    insertedValues = values;
    return chain;
  });
  chain.returning = vi.fn(() => Promise.resolve([{ id: 42 }]));
  mocks.insert.mockReturnValue(chain);
});

describe('insertAiTutorMessage — บังคับ questionId', () => {
  it('questionId ที่ถูกต้อง → insert ได้และคืน id', async () => {
    const id = await insertAiTutorMessage({
      userId: 'u1',
      questionId: 2098,
      role: 'user',
      content: 'คำถาม',
      status: 'pending',
    });
    expect(id).toBe(42);
    expect(insertedValues).toMatchObject({ questionId: 2098, role: 'user', status: 'pending' });
  });

  it('questionId = null → throw (ไม่เขียนลง DB)', async () => {
    await expect(insertAiTutorMessage({
      userId: 'u1',
      questionId: null as unknown as number,
      role: 'user',
      content: 'คำถาม',
      status: 'pending',
    })).rejects.toThrow(AI_TUTOR_QUESTION_ID_REQUIRED_MESSAGE);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('questionId = undefined → throw', async () => {
    await expect(insertAiTutorMessage({
      userId: 'u1',
      questionId: undefined as unknown as number,
      role: 'user',
      content: 'คำถาม',
      status: 'pending',
    })).rejects.toThrow(AI_TUTOR_QUESTION_ID_REQUIRED_MESSAGE);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('questionId = 0 หรือติดลบ → throw', async () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      await expect(insertAiTutorMessage({
        userId: 'u1',
        questionId: bad,
        role: 'user',
        content: 'คำถาม',
        status: 'pending',
      })).rejects.toThrow(AI_TUTOR_QUESTION_ID_REQUIRED_MESSAGE);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
