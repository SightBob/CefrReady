import { describe, it, expect } from 'vitest';
import { canRevealAnswer } from './reveal-guard';
import { FULL_TEST_TOTAL_QUESTIONS } from './constants';

describe('canRevealAnswer', () => {
  it('allows the selected question only', () => {
    expect(canRevealAnswer({ requestedQuestionId: 1, latestSelectedQuestionId: 1, requestedTestTypeId: 'focus-form', answeredCount: 0 }).allowed).toBe(true);
    expect(canRevealAnswer({ requestedQuestionId: 2, latestSelectedQuestionId: 1, requestedTestTypeId: 'focus-form', answeredCount: 0 }).allowed).toBe(false);
  });
  it.each(['focus-form', 'focus-meaning', 'listening', 'tap-select'])('fails closed without a selection for %s', (part) => {
    expect(canRevealAnswer({ requestedQuestionId: 1, latestSelectedQuestionId: null, requestedTestTypeId: part, answeredCount: 0 }).allowed).toBe(false);
  });
  it('denies completed slots when no selection exists', () => {
    expect(canRevealAnswer({ requestedQuestionId: 1, latestSelectedQuestionId: null, requestedTestTypeId: 'listening', answeredCount: FULL_TEST_TOTAL_QUESTIONS }).allowed).toBe(false);
  });
});
