import { describe, expect, it } from 'vitest';
import type { DbQuestion } from '@/db/schema';
import { calculateFullTestResult } from './result';
import { CEFR_SCORE_RANGES } from './constants';
import type { AttemptPathEntry } from './state';

const entry = (overrides: Partial<AttemptPathEntry> = {}): AttemptPathEntry => ({
  questionId: 1,
  testTypeId: 'focus-form',
  cefrLevel: 'B1',
  difficulty: null,
  wasCorrect: true,
  selectedAnswer: 'A',
  orderIndex: 0,
  ...overrides,
});

describe('shared adaptive result', () => {
  it('reports the weighted normalized score and keeps the level inside its band for a short attempt', () => {
    expect(
      calculateFullTestResult([entry({ cefrLevel: 'C2' }), entry({ questionId: 2, cefrLevel: 'A1', wasCorrect: false })])
    ).toMatchObject({ score: 50, normalizedScore: 113, cefrLevel: 'C2', confidence: 'low' });
  });

  it('keeps the level inside the band of the shown /120 score', () => {
    // 3 ข้อ A1 ถูกทั้งหมด + 3 ข้อ B1 ผิด → 24/120 (ช่วง A2 21–40)
    // เดิมระบบเลือกระดับจากความแม่น (A1 100%) ทำให้แสดง A1 คู่กับ 24/120 ขัดกับตารางช่วงคะแนน
    const path = [
      entry({ cefrLevel: 'A1', orderIndex: 0 }),
      entry({ questionId: 2, cefrLevel: 'A1', orderIndex: 1 }),
      entry({ questionId: 3, cefrLevel: 'A1', orderIndex: 2 }),
      entry({ questionId: 4, cefrLevel: 'B1', wasCorrect: false, orderIndex: 3 }),
      entry({ questionId: 5, cefrLevel: 'B1', wasCorrect: false, orderIndex: 4 }),
      entry({ questionId: 6, cefrLevel: 'B1', wasCorrect: false, orderIndex: 5 }),
    ];
    const result = calculateFullTestResult(path);
    const band = CEFR_SCORE_RANGES[result.cefrLevel];
    expect(result.normalizedScore).toBe(24);
    expect(result.cefrLevel).toBe('A2');
    expect(result.normalizedScore).toBeGreaterThanOrEqual(band.min);
    expect(result.normalizedScore).toBeLessThanOrEqual(band.max);
  });

  it('counts a cloze article as one question and reports its blanks separately', () => {
    const saved = {
      id: 1,
      article: { blanks: [{ id: 1, correctAnswer: 'is' }, { id: 2, correctAnswer: 'in' }] },
    } as DbQuestion;
    const path = [
      entry({ testTypeId: 'form-meaning', selectedAnswer: '{"1":" IS ","2":"wrong"}', wasCorrect: false, questionSnapshot: saved }),
    ];
    expect(
      calculateFullTestResult(path, [{ ...saved, article: { blanks: [{ id: 1, correctAnswer: 'was' }] } }])
    ).toMatchObject({
      score: 0,
      totalQuestions: 1,
      correctAnswers: 0,
      perPart: { 'form-meaning': { total: 1, correct: 0, blanksTotal: 2, blanksCorrect: 1 } },
      confidence: 'low',
    });
  });

  it('gives the cloze question credit only when every blank is correct', () => {
    const saved = {
      id: 1,
      article: { blanks: [{ id: 1, correctAnswer: 'is' }, { id: 2, correctAnswer: 'in' }] },
    } as DbQuestion;
    expect(
      calculateFullTestResult([
        entry({ testTypeId: 'form-meaning', selectedAnswer: '{"1":"is","2":" in "}', wasCorrect: false, questionSnapshot: saved }),
      ])
    ).toMatchObject({ totalQuestions: 1, correctAnswers: 1, perPart: { 'form-meaning': { total: 1, correct: 1 } } });
  });

  it('keeps the total question count equal to the number of answered slots, not the number of blanks', () => {
    const saved = {
      id: 1,
      article: { blanks: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, correctAnswer: `w${i + 1}` })) },
    } as DbQuestion;
    const path = [
      ...Array.from({ length: 15 }, (_, i) => entry({ questionId: 100 + i, testTypeId: 'focus-form', orderIndex: i })),
      entry({ questionId: 200, testTypeId: 'form-meaning', selectedAnswer: '{}', questionSnapshot: saved, orderIndex: 15 }),
      ...Array.from({ length: 15 }, (_, i) => entry({ questionId: 300 + i, testTypeId: 'listening', orderIndex: 16 + i })),
    ];
    expect(calculateFullTestResult(path).totalQuestions).toBe(31);
  });

  it('counts reused slots individually with the existing weight discount', () => {
    const result = calculateFullTestResult([entry({ reused: true }), entry({ wasCorrect: false, orderIndex: 1 })]);
    expect(result).toMatchObject({ totalQuestions: 2, normalizedScore: 40, reusedCount: 1 });
  });

  it('does not crash on malformed older cloze answers', () => {
    const question = { id: 1, article: { blanks: [{ id: 1, correctAnswer: 'is' }] } } as DbQuestion;
    expect(
      calculateFullTestResult([entry({ testTypeId: 'form-meaning', selectedAnswer: 'null', questionSnapshot: question })]).correctAnswers
    ).toBe(0);
  });

  it('matches the score band when every level has fewer than 3 attempts', () => {
    const result = calculateFullTestResult([entry({ cefrLevel: 'B1' }), entry({ questionId: 2, cefrLevel: 'B1', wasCorrect: false })]);
    expect(result.normalizedScore).toBe(60);
    expect(result.cefrLevel).toBe('B1');
  });
});
