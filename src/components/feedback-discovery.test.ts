import { describe, expect, it } from 'vitest';
import { shouldShowFeedbackDiscovery } from '@/lib/feedback-discovery';

describe('shouldShowFeedbackDiscovery', () => {
  it.each([
    [{ authenticated: false, tourCompleted: true, eligible: true, submitted: false }, false],
    [{ authenticated: true, tourCompleted: false, eligible: true, submitted: false }, false],
    [{ authenticated: true, tourCompleted: true, eligible: false, submitted: false }, false],
    [{ authenticated: true, tourCompleted: true, eligible: true, submitted: true }, false],
    [{ authenticated: true, tourCompleted: true, eligible: true, submitted: false }, true],
  ])('returns the expected trigger decision for %o', (input, expected) => {
    expect(shouldShowFeedbackDiscovery(input)).toBe(expected);
  });
});
