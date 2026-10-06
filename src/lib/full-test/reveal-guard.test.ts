import { describe, it, expect } from 'vitest';
import { canRevealAnswer } from './reveal-guard';
import { FULL_TEST_PART_DISTRIBUTION, FULL_TEST_TOTAL_QUESTIONS } from './constants';

describe('canRevealAnswer', () => {
  describe('with a selection log (authoritative)', () => {
    it('allows the question the attempt is currently on', () => {
      expect(
        canRevealAnswer({
          requestedQuestionId: 501,
          latestSelectedQuestionId: 501,
          requestedTestTypeId: 'focus-form',
          answeredCount: 7,
        })
      ).toEqual({ allowed: true, reason: 'current selection' });
    });

    it('denies another question even when it belongs to the same part', () => {
      const result = canRevealAnswer({
        requestedQuestionId: 999,
        latestSelectedQuestionId: 501,
        requestedTestTypeId: 'focus-form',
        answeredCount: 7,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not the current question');
    });

    it('denies a question from a different part', () => {
      expect(
        canRevealAnswer({
          requestedQuestionId: 777,
          latestSelectedQuestionId: 501,
          requestedTestTypeId: 'listening',
          answeredCount: 7,
        }).allowed
      ).toBe(false);
    });

    it('ignores answeredCount once a selection log exists', () => {
      // Even a fully-answered attempt can reveal the question it last selected.
      expect(
        canRevealAnswer({
          requestedQuestionId: 501,
          latestSelectedQuestionId: 501,
          requestedTestTypeId: 'listening',
          answeredCount: FULL_TEST_TOTAL_QUESTIONS,
        }).allowed
      ).toBe(true);
    });
  });

  describe('without a selection log (fallback)', () => {
    it('allows a question of the part belonging to the current slot', () => {
      const answeredCount = 20; // inside the focus-meaning block
      expect(
        canRevealAnswer({
          requestedQuestionId: 42,
          latestSelectedQuestionId: null,
          requestedTestTypeId: FULL_TEST_PART_DISTRIBUTION[answeredCount],
          answeredCount,
        }).allowed
      ).toBe(true);
    });

    it('denies a question of another part', () => {
      const result = canRevealAnswer({
        requestedQuestionId: 42,
        latestSelectedQuestionId: null,
        requestedTestTypeId: 'listening',
        answeredCount: 20,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('different part than the current slot');
    });

    it('denies harvesting keys for a question that is not in the test at all', () => {
      expect(
        canRevealAnswer({
          requestedQuestionId: 42,
          latestSelectedQuestionId: null,
          requestedTestTypeId: 'tap-select',
          answeredCount: 0,
        }).allowed
      ).toBe(false);
    });

    it('denies when the attempt has no current slot (all questions answered)', () => {
      const result = canRevealAnswer({
        requestedQuestionId: 42,
        latestSelectedQuestionId: null,
        requestedTestTypeId: 'listening',
        answeredCount: FULL_TEST_TOTAL_QUESTIONS,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('attempt has no current slot');
    });

    it('matches the first slot to the first part of the distribution', () => {
      expect(
        canRevealAnswer({
          requestedQuestionId: 1,
          latestSelectedQuestionId: null,
          requestedTestTypeId: FULL_TEST_PART_DISTRIBUTION[0],
          answeredCount: 0,
        }).allowed
      ).toBe(true);
    });

    it('matches the last slot to the last part of the distribution', () => {
      const lastSlot = FULL_TEST_TOTAL_QUESTIONS - 1;
      expect(
        canRevealAnswer({
          requestedQuestionId: 1,
          latestSelectedQuestionId: null,
          requestedTestTypeId: FULL_TEST_PART_DISTRIBUTION[lastSlot],
          answeredCount: lastSlot,
        }).allowed
      ).toBe(true);
    });
  });
});
