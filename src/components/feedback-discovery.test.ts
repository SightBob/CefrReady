import { describe, expect, it } from 'vitest';
import { shouldShowFeedbackDiscovery } from '@/lib/feedback-discovery';

describe('shouldShowFeedbackDiscovery', () => {
  it.each([
    [{ authenticated: false, eligible: true, submitted: false }, false],
    [{ authenticated: true, eligible: false, submitted: false }, false],
    [{ authenticated: true, eligible: true, submitted: true }, false],
    [{ authenticated: true, eligible: true, submitted: false }, true],
  ])('returns the expected trigger decision for %o', (input, expected) => {
    expect(shouldShowFeedbackDiscovery(input)).toBe(expected);
  });
});
