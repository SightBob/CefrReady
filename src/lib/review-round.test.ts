import { describe, expect, it } from 'vitest';
import {
  buildWrongSet,
  computeRetryOutcome,
  shuffleQueue,
} from './review-round';

describe('buildWrongSet', () => {
  const qs = [
    { correctAnswer: 'A' },
    { correctAnswer: 'B' },
    { correctAnswer: 'C' },
    { correctAnswer: 'D' },
  ];

  it('returns indices of answered-but-wrong questions', () => {
    expect(buildWrongSet(qs, ['A', 'B', null, 'A'])).toEqual([3]);
  });

  it('treats unanswered as not-wrong', () => {
    expect(buildWrongSet(qs, [null, null, null, null])).toEqual([]);
  });

  it('is case-insensitive on option keys', () => {
    expect(buildWrongSet(qs, ['A', 'b', 'c', 'C'])).toEqual([3]);
  });
});

describe('shuffleQueue', () => {
  it('preserves all elements without mutating input', () => {
    const src = [0, 1, 2, 3, 4];
    const out = shuffleQueue(src);
    expect([...out].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(src).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('computeRetryOutcome', () => {
  it('marks recovered when retry matches correct answer', () => {
    expect(computeRetryOutcome('B', 'c', 'C')).toBe('recovered');
  });

  it('marks still-wrong when retry misses again', () => {
    expect(computeRetryOutcome('B', 'D', 'C')).toBe('still-wrong');
  });
});
