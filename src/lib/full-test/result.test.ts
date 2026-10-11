import { describe, expect, it } from 'vitest';
import type { DbQuestion } from '@/db/schema';
import { calculateFullTestResult } from './result';
import type { AttemptPathEntry } from './state';
const entry = (overrides: Partial<AttemptPathEntry> = {}): AttemptPathEntry => ({ questionId: 1, testTypeId: 'focus-form', cefrLevel: 'B1', difficulty: null, wasCorrect: true, selectedAnswer: 'A', orderIndex: 0, ...overrides });
describe('shared adaptive result', () => {
  it('uses weighted CEFR rather than percentage estimation', () => {
    expect(calculateFullTestResult([entry({ cefrLevel: 'C2' }), entry({ questionId: 2, cefrLevel: 'A1', wasCorrect: false })])).toMatchObject({ score: 50, normalizedScore: 113, cefrLevel: 'C2', confidence: 'low' });
  });
  it('scores cloze from its saved snapshot, not an edited answer key', () => {
    const saved = { id: 1, article: { blanks: [{ id: 1, correctAnswer: 'is' }, { id: 2, correctAnswer: 'in' }] } } as DbQuestion;
    const path = [entry({ testTypeId: 'form-meaning', selectedAnswer: '{"1":" IS ","2":"wrong"}', wasCorrect: false, questionSnapshot: saved })];
    expect(calculateFullTestResult(path, [{ ...saved, article: { blanks: [{ id: 1, correctAnswer: 'was' }] } }])).toMatchObject({ score: 50, totalQuestions: 2, correctAnswers: 1, perPart: { 'form-meaning': { total: 2, correct: 1 } }, confidence: 'low' });
  });
  it('counts reused slots individually with the existing weight discount', () => {
    const result = calculateFullTestResult([entry({ reused: true }), entry({ wasCorrect: false, orderIndex: 1 })]);
    expect(result).toMatchObject({ totalQuestions: 2, normalizedScore: 40, reusedCount: 1 });
  });
  it('does not crash on malformed older cloze answers', () => {
    const question = { id: 1, article: { blanks: [{ id: 1, correctAnswer: 'is' }] } } as DbQuestion;
    expect(calculateFullTestResult([entry({ testTypeId: 'form-meaning', selectedAnswer: 'null', questionSnapshot: question })]).correctAnswers).toBe(0);
  });
});
