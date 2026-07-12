import { describe, expect, it } from 'vitest';
import { shouldShowFeedbackDiscovery } from '@/lib/feedback-discovery';

describe('shouldShowFeedbackDiscovery', () => {
  it.each([
    [{ authenticated: false, seen: false, tourCompleted: true }, false],
    [{ authenticated: true, seen: true, tourCompleted: true }, false],
    [{ authenticated: true, seen: false, tourCompleted: false }, false],
    [{ authenticated: true, seen: false, tourCompleted: true }, true],
  ])('returns the expected trigger decision for %o', (input, expected) => {
    expect(shouldShowFeedbackDiscovery(input)).toBe(expected);
  });
});
