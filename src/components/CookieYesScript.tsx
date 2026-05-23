'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * CookieYes Script Component
 *
 * This component loads the CookieYes consent banner script with proper
 * initialization checking and retry logic.
 *
 * Debug commands available in browser console:
 * - window.clearCookieYesConsent() - Clear all consent data
 * - window.checkCookieYesConsent() - Check current consent state
 * - window.resetCookieYesAndReload() - Clear consent and reload
 */

export default function CookieYesScript() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // DEBUG: Log initial state
    // eslint-disable-next-line no-console
    console.log('[CookieYes] Component mounted');

    // Poll for CookieYes widget initialization
    const checkWidget = () => {
      const win = window as Window & {
        cookieyes?: {
          show?: () => void;
          showBanner?: () => void;
          openPreferences?: () => void;
        };
        _cky?: {
          init?: () => void;
        };
      };

      // Check if widget is properly initialized (not just the script element)
      const hasWidget = win.cookieyes &&
        (typeof win.cookieyes.show === 'function' ||
         typeof win.cookieyes.showBanner === 'function');

      if (hasWidget) {
        // eslint-disable-next-line no-console
        console.log('[CookieYes] Widget initialized successfully');
        return true;
      }

      return false;
    };

    // Check for existing consent
    const checkConsent = () => {
      const consent = localStorage.getItem('cookieyes-consent');
      if (consent) {
        // eslint-disable-next-line no-console
        console.log('[CookieYes] Found existing consent:', consent);
      } else {
        // eslint-disable-next-line no-console
        console.log('[CookieYes] No prior consent found');
      }
      return consent;
    };

    // Poll for widget initialization
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    const pollInterval = setInterval(() => {
      attempts++;
      if (checkWidget()) {
        clearInterval(pollInterval);
        checkConsent();
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        // eslint-disable-next-line no-console
        console.log('[CookieYes] Widget initialization timed out after 30s');
        // eslint-disable-next-line no-console
        console.log('[CookieYes] Try running: window.resetCookieYesAndReload()');
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [scriptLoaded]);

  return (
    <Script
      id="cookieyes"
      src="https://cdn-cookieyes.com/client_data/7b7ab807831ace83bc43904a/script.js"
      strategy="afterInteractive"
      onLoad={() => {
        // eslint-disable-next-line no-console
        console.log('[CookieYes] Script loaded');
        setScriptLoaded(true);
      }}
      onError={(e) => {
        // eslint-disable-next-line no-console
        console.error('[CookieYes] Script failed to load:', e);
      }}
    />
  );
}
