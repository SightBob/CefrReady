import { describe, expect, it } from 'vitest';
import {
  filterQuestionsForLearners,
  isTapExerciseVisibleToLearners,
  parseTapExerciseStatus,
  resolveTapExerciseStatus,
} from './tap-visibility';

describe('parseTapExerciseStatus', () => {
  it('keeps the four known statuses', () => {
    for (const status of ['draft', 'review', 'published', 'hidden']) {
      expect(parseTapExerciseStatus(status)).toBe(status);
    }
  });

  it('treats old activities with no status as published so learners keep them', () => {
    expect(parseTapExerciseStatus(undefined)).toBe('published');
    expect(parseTapExerciseStatus(null)).toBe('published');
    expect(parseTapExerciseStatus('')).toBe('published');
    expect(parseTapExerciseStatus('ARCHIVED')).toBe('published');
  });
});

describe('isTapExerciseVisibleToLearners', () => {
  it('shows only published activities and hides every other status', () => {
    expect(isTapExerciseVisibleToLearners({ status: 'published' })).toBe(true);
    expect(isTapExerciseVisibleToLearners({})).toBe(true);
    expect(isTapExerciseVisibleToLearners(null)).toBe(true);
    expect(isTapExerciseVisibleToLearners({ status: 'review' })).toBe(false);
    expect(isTapExerciseVisibleToLearners({ status: 'draft' })).toBe(false);
    expect(isTapExerciseVisibleToLearners({ status: 'hidden' })).toBe(false);
  });
});

describe('resolveTapExerciseStatus', () => {
  it('returns undefined when the admin did not send a status, so the old value is kept', () => {
    expect(resolveTapExerciseStatus(undefined)).toBeUndefined();
    expect(resolveTapExerciseStatus(null)).toBeUndefined();
  });

  it('accepts known statuses and rejects anything else', () => {
    expect(resolveTapExerciseStatus('review')).toBe('review');
    expect(resolveTapExerciseStatus('published')).toBe('published');
    expect(resolveTapExerciseStatus('pending')).toBeNull();
  });
});

describe('filterQuestionsForLearners', () => {
  const questions = [
    { id: 1, questionText: 'MCQ' },
    { id: 2, tapExercise: { title: 'Tap published', status: 'published' } },
    { id: 3, tapExercise: { title: 'Tap review', status: 'review' } },
    { id: 4, tapExercise: { title: 'Tap legacy' } },
    { id: 5, tapExercise: { title: 'Tap hidden', status: 'hidden' } },
  ];

  it('drops only the Tap & Select activities that are not published', () => {
    expect(filterQuestionsForLearners(questions).map((row) => row.id)).toEqual([1, 2, 4]);
  });

  it('leaves a set with no Tap & Select activities untouched', () => {
    const plain = [{ id: 1 }, { id: 2 }];
    expect(filterQuestionsForLearners(plain)).toEqual(plain);
  });
});
