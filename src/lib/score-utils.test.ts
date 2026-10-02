import { describe, expect, it } from 'vitest';
import { calculateScore } from './score-utils';

describe('calculateScore Tap & Select', () => {
  const questions = [{
    id: 5,
    testTypeId: 'focus-form',
    correctAnswer: null,
    explanation: null,
    tapExercise: {
      title: 'Choose',
      items: [
        { prompt: 'First', choiceA: 'is', choiceB: 'are', correct: 0 as const },
        { prompt: 'Second', choiceA: 'was', choiceB: 'were', correct: 1 as const },
      ],
    },
  }];

  it('counts every item separately and accepts A/B answer keys', () => {
    expect(calculateScore([{ questionId: 5, selectedAnswer: '{"0":"A","1":"B"}' }], questions)).toMatchObject({
      correctCount: 2,
      totalQuestions: 2,
      score: 100,
      results: [{ isCorrect: true }],
    });
  });

  it('scores partial and blank answers per item', () => {
    expect(calculateScore([{ questionId: 5, selectedAnswer: '{"0":"A"}' }], questions)).toMatchObject({
      correctCount: 1,
      totalQuestions: 2,
      score: 50,
      results: [{ isCorrect: false }],
    });
  });
});
