/**
 * CookieYes Debug Utilities
 * Use these to clear consent state and debug issues
 */

// Storage keys used by CookieYes
const COOKIEYES_KEYS = {
  localStorage: ['cookieyes-consent', 'cookieyes-necessary', 'cookieyes-analytics', 'cookieyes-marketing', 'cookieyes-preferences'],
  cookies: ['cookieyes-consent', 'cookieyes-necessary', 'cookieyes-analytics', 'cookieyes-marketing', 'cookieyes-preferences', 'cky-consent'],
};

/**
 * Clear all CookieYes consent data from localStorage and cookies
 * Call this in browser console to reset consent and see the banner again
 */
export function clearCookieYesConsent(): void {
  if (typeof window === 'undefined') return;

  // Clear localStorage
  COOKIEYES_KEYS.localStorage.forEach((key) => {
    const existed = localStorage.getItem(key);
    if (existed !== null) {
      localStorage.removeItem(key);
      // eslint-disable-next-line no-console
      console.log(`[CookieYes Debug] Cleared localStorage: ${key}`);
    }
  });

  // Clear cookies
  const domain = window.location.hostname;
  COOKIEYES_KEYS.cookies.forEach((key) => {
    // Clear for current domain
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
  });

  // eslint-disable-next-line no-console
  console.log('[CookieYes Debug] All CookieYes consent data cleared. Reload page to see banner.');
}

/**
 * Check current CookieYes consent state
 * Returns parsed consent data or null if not found
 */
export function checkCookieYesConsent(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;

  const results: Record<string, unknown> = {};

  // Check localStorage
  COOKIEYES_KEYS.localStorage.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        results[key] = JSON.parse(value);
      } catch {
        results[key] = value;
      }
    }
  });

  // Check cookies
  const cookies = document.cookie.split(';').map((c) => c.trim());
  COOKIEYES_KEYS.cookies.forEach((key) => {
    const match = cookies.find((c) => c.startsWith(`${key}=`));
    if (match) {
      const value = match.split('=')[1];
      try {
        results[`cookie_${key}`] = JSON.parse(decodeURIComponent(value));
      } catch {
        results[`cookie_${key}`] = decodeURIComponent(value);
      }
    }
  });

  // Check if CookieYes global is available
  if ((window as Window & { cookieyes?: unknown }).cookieyes) {
    results['cookieyes_global'] = 'available';
  }

  if (Object.keys(results).length === 0) {
    // eslint-disable-next-line no-console
    console.log('[CookieYes Debug] No consent data found. Banner should be visible.');
    return null;
  }

  // eslint-disable-next-line no-console
  console.log('[CookieYes Debug] Current consent state:', results);
  return results;
}

/**
 * Force show the CookieYes banner
 * Requires the cookieyes global to be available
 */
export function forceShowCookieYesBanner(): void {
  if (typeof window === 'undefined') return;

  const win = window as Window & {
    cookieyes?: {
      showBanner?: () => void;
      openPreferences?: () => void;
    };
  };

  if (win.cookieyes?.showBanner) {
    win.cookieyes.showBanner();
    // eslint-disable-next-line no-console
    console.log('[CookieYes Debug] Banner shown via API');
  } else if (win.cookieyes?.openPreferences) {
    win.cookieyes.openPreferences();
    // eslint-disable-next-line no-console
    console.log('[CookieYes Debug] Preferences opened via API');
  } else {
    // eslint-disable-next-line no-console
    console.log('[CookieYes Debug] CookieYes API not available. Try clearing consent first.');
  }
}

/**
 * Complete reset: clear all data and reload the page
 */
export function resetCookieYesAndReload(): void {
  clearCookieYesConsent();
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

// Make available globally for console debugging
if (typeof window !== 'undefined') {
  (window as Window & { cookieyesDebug?: typeof clearCookieYesConsent }).cookieyesDebug = clearCookieYesConsent;
  (window as Window & { checkCookieYesConsent?: typeof checkCookieYesConsent }).checkCookieYesConsent = checkCookieYesConsent;
  (window as Window & { forceShowCookieYesBanner?: typeof forceShowCookieYesBanner }).forceShowCookieYesBanner = forceShowCookieYesBanner;
  (window as Window & { resetCookieYesAndReload?: typeof resetCookieYesAndReload }).resetCookieYesAndReload = resetCookieYesAndReload;
}
