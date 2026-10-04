import { describe, expect, it } from 'vitest';
import {
  buildTestSubmissionAnswers,
  expandTestSetSlots,
  findIncorrectTestSetSlots,
  getDisplayedChoiceAnswer,
  getOriginalChoiceAnswer,
  getChoiceOptionText,
  getDisplayedTapChoiceAnswer,
  getOriginalTapChoiceAnswer,
  shuffleChoiceOptions,
  shuffleTapExerciseChoices,
} from './test-set-slots';

const questions = [
  { id: 1 },
  { id: 2, tapExercise: { title: 'Tap', items: [
    { prompt: 'One', choiceA: 'A', choiceB: 'B', correct: 0 as const },
    { prompt: 'Two', choiceA: 'C', choiceB: 'D', correct: 1 as const },
  ] } },
  { id: 3 },
];

describe('shuffleChoiceOptions', () => {
  it('shuffles display positions deterministically and preserves answer-key mapping', () => {
    const options = [
      { key: 'A', value: 'Alpha' },
      { key: 'B', value: 'Bravo' },
      { key: 'C', value: 'Charlie' },
      { key: 'D', value: 'Delta' },
    ];
    const shuffled = shuffleChoiceOptions(options, 'set-1-question-7-attempt-x');

    expect(shuffleChoiceOptions(options, 'set-1-question-7-attempt-x')).toEqual(shuffled);
    expect(shuffled.map(option => option.key)).toEqual(['A', 'B', 'C', 'D']);
    expect(shuffled.map(option => option.answerKey)).not.toEqual(['A', 'B', 'C', 'D']);
    for (const option of shuffled) {
      expect(options.find(original => original.key === option.answerKey)?.value).toBe(option.value);
      expect(getOriginalChoiceAnswer(option.key, shuffled)).toBe(option.answerKey);
      expect(getDisplayedChoiceAnswer(option.answerKey, shuffled)).toBe(option.key);
    }
  });
});

describe('shuffleTapExerciseChoices', () => {
  it('keeps Tap & Select correct answers aligned to their shuffled displayed choice', () => {
    const original = { prompt: 'Pick one', choiceA: 'first', choiceB: 'second', correct: 0 as const };
    const { item, answerKeys } = shuffleTapExerciseChoices(original, 'attempt-tap-1');
    const expectedDisplayedKey = item.choiceA === original.choiceA ? 'A' : 'B';

    expect(item.choiceA).not.toBe(original.choiceA);
    expect(item.correct === 0 ? item.choiceA : item.choiceB).toBe(original.choiceA);
    expect(getOriginalTapChoiceAnswer(expectedDisplayedKey, answerKeys)).toBe('A');
    expect(getDisplayedTapChoiceAnswer('A', answerKeys)).toBe(expectedDisplayedKey);
  });
});

describe('expandTestSetSlots', () => {
  it('expands Tap & Select items in place and preserves set order', () => {
    expect(expandTestSetSlots(questions)).toEqual([
      { questionIndex: 0, kind: 'question' },
      { questionIndex: 1, kind: 'tap', itemIndex: 0 },
      { questionIndex: 1, kind: 'tap', itemIndex: 1 },
      { questionIndex: 2, kind: 'question' },
    ]);
  });

  it('expands form-meaning blanks to item slots in authored order', () => {
    expect(expandTestSetSlots([
      { id: 7, testTypeId: 'form-meaning', article: { title: 'A', text: '{{2}} {{1}}', blanks: [
        { id: 2, correctAnswer: 'went' }, { id: 1, correctAnswer: 'home' },
      ] } },
    ])).toEqual([
      { questionIndex: 0, kind: 'article', blankId: 2 },
      { questionIndex: 0, kind: 'article', blankId: 1 },
    ]);
  });
});

describe('findIncorrectTestSetSlots', () => {
  it('identifies incorrect Tap and regular-question slots without exposing answers', () => {
    const questionsWithAnswerKeys = [
      { id: 10, correctAnswer: 'B' },
      { id: 11, tapExercise: { title: 'Tap', items: [
        { prompt: 'First', choiceA: 'One', choiceB: 'Two', correct: 0 as const },
        { prompt: 'Second', choiceA: 'Three', choiceB: 'Four', correct: 1 as const },
      ] } },
    ];
    const slots = expandTestSetSlots(questionsWithAnswerKeys);

    expect(findIncorrectTestSetSlots(questionsWithAnswerKeys, slots, [
      { questionId: 10, selectedAnswer: 'A' },
      { questionId: 11, selectedAnswer: '{"0":"A","1":"A"}' },
    ])).toEqual([0, 2]);
  });
});

describe('buildTestSubmissionAnswers', () => {
  it('converts displayed shuffled choices back to their original answer keys before submission', () => {
    const question = [{ id: 21, correctAnswer: 'B' }];
    const slots = expandTestSetSlots(question);
    const options = shuffleChoiceOptions([
      { key: 'A', value: 'Alpha' }, { key: 'B', value: 'Bravo' },
      { key: 'C', value: 'Charlie' }, { key: 'D', value: 'Delta' },
    ], 'attempt-21');
    const displayedCorrectKey = getDisplayedChoiceAnswer('B', options);

    expect(buildTestSubmissionAnswers(question, slots, [displayedCorrectKey], (_question, _slot, answer) =>
      getOriginalChoiceAnswer(answer, options)
    )).toEqual([{ questionId: 21, selectedAnswer: 'B' }]);
  });

  it('packs the expanded answers per database question', () => {
    const slots = expandTestSetSlots(questions);
    expect(buildTestSubmissionAnswers(questions, slots, ['D', 'A', 'B', 'C'])).toEqual([
      { questionId: 1, selectedAnswer: 'D' },
      { questionId: 2, selectedAnswer: '{"0":"A","1":"B"}' },
      { questionId: 3, selectedAnswer: 'C' },
    ]);
  });

  it('keeps article answers keyed by their original blank ids', () => {
    const articleQuestion = [{ id: 8, testTypeId: 'form-meaning', article: {
      title: 'A', text: '{{4}} {{2}}', blanks: [
        { id: 4, correctAnswer: 'went' }, { id: 2, correctAnswer: 'home' },
      ],
    } }];
    expect(buildTestSubmissionAnswers(articleQuestion, expandTestSetSlots(articleQuestion), ['went', 'home']))
      .toEqual([{ questionId: 8, selectedAnswer: '{"2":"home","4":"went"}' }]);
  });
});

describe('getChoiceOptionText', () => {
  const question = { optionA: 'is', optionB: 'are', optionC: 'was', optionD: 'were' };

  it('maps a stored answer key back to the option text', () => {
    expect(getChoiceOptionText(question, 'B')).toBe('are');
    expect(getChoiceOptionText(question, 'A')).toBe('is');
  });

  it('returns null when nothing was answered and the key when it is not an option key', () => {
    expect(getChoiceOptionText(question, null)).toBeNull();
    expect(getChoiceOptionText(question, '')).toBeNull();
    expect(getChoiceOptionText(question, 'running')).toBe('running');
  });

  it('falls back to the key when the matching option text is missing', () => {
    expect(getChoiceOptionText({ optionA: 'is' }, 'C')).toBe('C');
  });
});
