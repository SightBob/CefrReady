import { describe, it, expect } from 'vitest';
import { getNextLevel, selectQuestion } from './algorithm';
import type { CefrLevel } from './constants';
import type { DbQuestion } from './algorithm';

describe('getNextLevel', () => {
  it('moves up after first correct answer', () => {
    expect(getNextLevel('B1', [true])).toBe('B2');
  });

  it('moves down after first incorrect answer', () => {
    expect(getNextLevel('B1', [false])).toBe('A2');
  });

  it('clamps at A1', () => {
    expect(getNextLevel('A1', [false])).toBe('A1');
  });

  it('clamps at C2', () => {
    expect(getNextLevel('C2', [true])).toBe('C2');
  });

  it('uses last 2 answers for question 2', () => {
    expect(getNextLevel('B1', [true, true])).toBe('B2');
    expect(getNextLevel('B1', [true, false])).toBe('B1');
    expect(getNextLevel('B1', [false, false])).toBe('A2');
  });

  it('uses weighted window of last 5 answers', () => {
    expect(getNextLevel('B1', [false, false, true, true, true, true])).toBe('B2');
    expect(getNextLevel('B1', [true, true, false, false, false, false])).toBe('A2');
  });
});

const makeQuestion = (id: number, testTypeId: string, cefrLevel: CefrLevel): DbQuestion =>
  ({
    id,
    testTypeId,
    cefrLevel,
    questionText: '',
  } as unknown as DbQuestion);

describe('selectQuestion', () => {
  it('returns target level when available', () => {
    const q = makeQuestion(1, 'focus-form', 'B1');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.id).toBe(1);
  });

  it('falls back to nearest level when target exhausted', () => {
    const q = makeQuestion(2, 'focus-form', 'B2');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.id).toBe(2);
  });

  it('respects required test type', () => {
    const q = makeQuestion(3, 'listening', 'B1');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result).toBeNull();
  });
});
