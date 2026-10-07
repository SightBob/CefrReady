import { describe, expect, it } from 'vitest';
import { shouldLoadPromoModal } from './DeferredPromoModal';

describe('shouldLoadPromoModal', () => {
  it.each(['/tests', '/tests/focus-form/1', '/demo/listening', '/checkout'])(
    'skips performance-sensitive route %s',
    (pathname) => {
      expect(shouldLoadPromoModal(pathname)).toBe(false);
    }
  );

  it.each(['/', '/pricing', '/progress', '/redeem'])(
    'allows promo route %s after idle',
    (pathname) => {
      expect(shouldLoadPromoModal(pathname)).toBe(true);
    }
  );
});
