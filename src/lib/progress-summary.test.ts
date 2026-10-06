import { describe, expect, it } from 'vitest';
import { formatProgressSummary } from './progress-summary';

describe('formatProgressSummary', () => {
  it('returns an empty summary without progress', () => {
    expect(formatProgressSummary([], [])).toEqual({
      overall: { testsTaken: 0, averageScore: 0 },
      byCategory: [],
      recentAttempts: [],
    });
  });

  it('calculates a weighted average and normalizes invalid scores', () => {
    const result = formatProgressSummary(
      [
        { testTypeId: 'focus-form', averageScore: '80', testsTaken: 3 },
        { testTypeId: 'listening', averageScore: 'not-a-number', testsTaken: 1 },
      ],
      []
    );

    expect(result.overall).toEqual({ testsTaken: 4, averageScore: 60 });
    expect(result.byCategory).toEqual([
      { testTypeId: 'focus-form', averageScore: 80, testsTaken: 3 },
      { testTypeId: 'listening', averageScore: 0, testsTaken: 1 },
    ]);
  });

  it('formats attempt metadata already joined by the database', () => {
    const result = formatProgressSummary([], [
      {
        id: 7,
        testTypeId: 'focus-form',
        testTypeName: null,
        score: '72.5',
        totalQuestions: 20,
        correctAnswers: 15,
        completedAt: new Date('2026-07-06T00:00:00.000Z'),
      },
    ]);

    expect(result.recentAttempts).toEqual([
      {
        id: 7,
        testTypeId: 'focus-form',
        testTypeName: 'focus-form',
        score: 72.5,
        totalQuestions: 20,
        correctAnswers: 15,
        completedAt: '2026-07-06T00:00:00.000Z',
      },
    ]);
  });
});
