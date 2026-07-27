import { describe, it, expect } from 'vitest';
import { getNextLevel, selectQuestion, calculateRawScore, calculateMaxPossibleScore, normalizeScore, normalizedScoreToCefr, calculateConfidence, getInitialLevels, getPerTypeAnswerHistory } from './algorithm';
import type { CefrLevel } from './constants';
import type { DbQuestion } from '@/db/schema';

describe('getNextLevel', () => {
  it('keeps current level with empty history (below minimum window)', () => {
    expect(getNextLevel('B1', [])).toBe('B1');
  });

  it('keeps current level with 1 answer (below minimum window of 3)', () => {
    expect(getNextLevel('B1', [true])).toBe('B1');
    expect(getNextLevel('B1', [false])).toBe('B1');
  });

  it('keeps current level with 2 answers (below minimum window of 3)', () => {
    expect(getNextLevel('B1', [true, true])).toBe('B1');
    expect(getNextLevel('B1', [true, false])).toBe('B1');
  });

  it('adjusts level with 3+ answers (at minimum window)', () => {
    expect(getNextLevel('B1', [true, true, true])).toBe('C1');
    expect(getNextLevel('B1', [false, false, false])).toBe('A1');
    expect(getNextLevel('B1', [true, true, false])).toBe('B2');
  });

  it('clamps at A1', () => {
    expect(getNextLevel('A1', [false, false, false, false, false])).toBe('A1');
  });

  it('clamps at C2', () => {
    expect(getNextLevel('C2', [true, true, true, true, true])).toBe('C2');
  });

  it('major step up (+2) when avg >= 0.9 with window of 5', () => {
    expect(getNextLevel('B1', [true, true, true, true, true])).toBe('C1');
  });

  it('major step down (-2) when avg <= 0.1 with window of 5', () => {
    expect(getNextLevel('B1', [false, false, false, false, false])).toBe('A1');
  });

  it('normal step up when avg >= 0.6 (3/5)', () => {
    expect(getNextLevel('B1', [false, true, true, false, true])).toBe('B2');
  });

  it('normal step down when avg <= 0.4 (2/5)', () => {
    expect(getNextLevel('B1', [true, false, false, false, true])).toBe('A2');
  });

  it('stays in dead zone when avg < 0.6 and > 0.4', () => {
    expect(getNextLevel('B1', [true, false, true, false])).toBe('B1');
  });

  it('uses sliding window of last 5 answers', () => {
    expect(getNextLevel('B1', [true, true, false, true, true, false, false, true])).toBe('B2');
  });
});

describe('getPerTypeAnswerHistory', () => {
  it('filters answers by test type', () => {
    const path = [
      { testTypeId: 'focus-form', wasCorrect: true },
      { testTypeId: 'focus-form', wasCorrect: false },
      { testTypeId: 'listening', wasCorrect: true },
      { testTypeId: 'focus-form', wasCorrect: true },
    ];
    expect(getPerTypeAnswerHistory(path, 'focus-form')).toEqual([true, false, true]);
    expect(getPerTypeAnswerHistory(path, 'listening')).toEqual([true]);
    expect(getPerTypeAnswerHistory(path, 'form-meaning')).toEqual([]);
  });
});

describe('getInitialLevels', () => {
  it('returns all types set to start level', () => {
    const levels = getInitialLevels('B2');
    expect(levels).toEqual({
      'focus-form': 'B2',
      'focus-meaning': 'B2',
      'form-meaning': 'B2',
      'listening': 'B2',
    });
  });
});

const makeQuestion = (id: number, testTypeId: string, cefrLevel: CefrLevel): DbQuestion =>
  ({
    id,
    testTypeId,
    cefrLevel,
    questionText: '',
    active: 'true',
    orderIndex: 0,
  } as DbQuestion);

describe('selectQuestion', () => {
  it('returns target level when available (not reused)', () => {
    const q = makeQuestion(1, 'focus-form', 'B1');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.question.id).toBe(1);
    expect(result?.reused).toBe(false);
  });

  it('falls back to nearest level when target exhausted (not reused)', () => {
    const q = makeQuestion(2, 'focus-form', 'B2');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.question.id).toBe(2);
    expect(result?.reused).toBe(false);
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

  it('reuses previously seen questions when all levels exhausted (marked as reused)', () => {
    const q = makeQuestion(1, 'focus-form', 'B1');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set([1]),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.question.id).toBe(1);
    expect(result?.reused).toBe(true);
  });

  it('returns null when no questions match required type', () => {
    const result = selectQuestion({
      questions: [],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result).toBeNull();
  });
});

describe('scoring with non-linear weights', () => {
  it('calculates raw and normalized score with non-linear weights', () => {
    const path = [
      { cefrLevel: 'B1' as CefrLevel, wasCorrect: true },
      { cefrLevel: 'B2' as CefrLevel, wasCorrect: true },
      { cefrLevel: 'A2' as CefrLevel, wasCorrect: false },
    ];
    const raw = calculateRawScore(path);
    const max = calculateMaxPossibleScore(path);
    expect(raw).toBe(11);
    expect(max).toBe(13);
    expect(normalizeScore(raw, max)).toBe(102);
  });

  it('applies reuse discount to scoring', () => {
    const path = [
      { cefrLevel: 'B1' as CefrLevel, wasCorrect: true, reused: false },
      { cefrLevel: 'B2' as CefrLevel, wasCorrect: true, reused: true },
    ];
    const raw = calculateRawScore(path);
    const max = calculateMaxPossibleScore(path);
    expect(raw).toBe(4 + 3.5);
    expect(max).toBe(4 + 3.5);
    expect(normalizeScore(raw, max)).toBe(120);
  });

  it('correct answer on reused question gets half weight', () => {
    const path = [
      { cefrLevel: 'C2' as CefrLevel, wasCorrect: true, reused: true },
    ];
    const raw = calculateRawScore(path);
    expect(raw).toBe(8);
  });

  it('reused incorrect answer contributes zero raw but discounted max', () => {
    const path = [
      { cefrLevel: 'B1' as CefrLevel, wasCorrect: true, reused: false },
      { cefrLevel: 'C1' as CefrLevel, wasCorrect: false, reused: true },
    ];
    const raw = calculateRawScore(path);
    const max = calculateMaxPossibleScore(path);
    expect(raw).toBe(4);
    expect(max).toBe(4 + 5.5);
  });

  it('maps normalized score to CEFR', () => {
    expect(normalizedScoreToCefr(93)).toBe('C1');
    expect(normalizedScoreToCefr(45)).toBe('B1');
    expect(normalizedScoreToCefr(0)).toBe('A1');
  });

  it('maps boundary scores to CEFR', () => {
    expect(normalizedScoreToCefr(1)).toBe('A1');
    expect(normalizedScoreToCefr(20)).toBe('A1');
    expect(normalizedScoreToCefr(21)).toBe('A2');
    expect(normalizedScoreToCefr(120)).toBe('C2');
    expect(normalizedScoreToCefr(200)).toBe('C2');
  });
});

describe('calculateConfidence', () => {
  it('returns high for 20+ questions', () => {
    expect(calculateConfidence(20)).toBe('high');
    expect(calculateConfidence(45)).toBe('high');
  });

  it('returns medium for 10-19 questions', () => {
    expect(calculateConfidence(10)).toBe('medium');
    expect(calculateConfidence(15)).toBe('medium');
  });

  it('returns low for fewer than 10 questions', () => {
    expect(calculateConfidence(5)).toBe('low');
    expect(calculateConfidence(1)).toBe('low');
  });
});
