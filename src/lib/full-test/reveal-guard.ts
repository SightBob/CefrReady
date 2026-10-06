import { FULL_TEST_PART_DISTRIBUTION } from './constants';

export interface RevealGuardInput {
  /** Question the client asked the answer key for. */
  requestedQuestionId: number;
  /** Question id of the newest selection log row for this attempt (null = no logs yet). */
  latestSelectedQuestionId: number | null;
  /** testTypeId (part) of the requested question, read from the questions table. */
  requestedTestTypeId: string;
  /** How many questions the attempt has already moved past (adaptivePath length). */
  answeredCount: number;
}

/**
 * `/api/tests/full/check` reveals the answer key of a question after the learner
 * commits to a choice. It previously accepted ANY question id, so a signed-in
 * learner could walk the whole question bank through that endpoint and collect
 * answer keys without ever sitting the exam — exactly what the C3 rule
 * ("never send correctAnswer/explanation pre-submission") exists to prevent.
 *
 * The server has no `currentQuestionId` column, but every selection is recorded
 * in `question_selection_logs`, so the newest log row for the attempt IS the
 * question the learner is looking at. When that log exists it is authoritative.
 *
 * Fallback (an attempt whose selection logging failed): allow only a question
 * that belongs to the part of the current slot, so probing other parts — the
 * realistic way to farm keys ahead of time — is still blocked.
 */
export function canRevealAnswer({
  requestedQuestionId,
  latestSelectedQuestionId,
  requestedTestTypeId,
  answeredCount,
}: RevealGuardInput): { allowed: boolean; reason: string } {
  if (latestSelectedQuestionId !== null) {
    return latestSelectedQuestionId === requestedQuestionId
      ? { allowed: true, reason: 'current selection' }
      : { allowed: false, reason: 'not the current question' };
  }

  const expectedPart = FULL_TEST_PART_DISTRIBUTION[answeredCount];
  if (!expectedPart) {
    return { allowed: false, reason: 'attempt has no current slot' };
  }
  return requestedTestTypeId === expectedPart
    ? { allowed: true, reason: 'current part (no selection log)' }
    : { allowed: false, reason: 'different part than the current slot' };
}
