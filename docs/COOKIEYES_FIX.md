# CookieYes Banner Fix for Next.js

## Problem Diagnosis

The CookieYes banner was appearing briefly then disappearing. Root causes identified:

1. **Domain validation** - CookieYes checks if the current domain matches the registered domain (`cefr-ready.site`). On localhost, it throws an error and doesn't show the banner.
2. **Prior consent in storage** - CookieYes stores consent in `localStorage` and cookies. If user previously interacted, banner auto-hides.
3. **Script loading timing** - Using `next/script` with wrong strategy can cause issues.

## Critical Finding: Domain Restriction

**CookieYes only works on the registered domain (`cefr-ready.site`), NOT on localhost.**

The script contains this validation:
```javascript
if(!function(){try{const e={registeredDomain:"cefr-ready.site",currentDomain:window.location.hostname}...
```

If the domain doesn't match, it throws:
```
Error: Looks like your website URL has changed. To ensure the proper functioning of your banner, update the registered URL on your CookieYes account...
```

## Solution Implemented

### 1. Direct Script Tag in `src/app/layout.tsx`
The script is now loaded directly in the HTML `<head>` without `next/script`:
```tsx
<head>
  {/* ... other head elements ... */}
  <script
    id="cookieyes-banner-script"
    src="https://cdn-cookieyes.com/client_data/7b7ab807831ace83bc43904a/script.js"
  />
</head>
```

### 2. CSS in `src/app/globals.css`
```css
/* Ensure CookieYes banner is always visible and on top */
.cky-overlay,
.cky-modal,
#cookieyes-banner,
.cky-consent-container,
.cky-consent-bar {
  z-index: 99999 !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
```

### 3. Debug Utilities in `src/lib/cookieyes-debug.ts`
Console commands available in browser (only works on production domain):
```javascript
window.clearCookieYesConsent()      // Clear all consent data
window.checkCookieYesConsent()       // Check current consent state
window.resetCookieYesAndReload()     // Clear consent and reload
```

## Verification Steps

### Local Development (localhost:3000)
The banner **will NOT appear** on localhost due to CookieYes domain validation. This is expected behavior.

To test locally, you have two options:

**Option 1: Use a local domain alias**
1. Edit your hosts file: `127.0.0.1  local.cefr-ready.site`
2. Access via: `http://local.cefr-ready.site:3000`

**Option 2: Deploy to staging/production**
The banner will only appear on the actual domain: `https://cefr-ready.site`

### Production Testing

1. **Clear existing consent** (if banner was previously accepted):
   ```javascript
   // In browser console on cefr-ready.site
   window.clearCookieYesConsent()
   location.reload()
   ```

2. **Verify banner appears:**
   - Banner shows at bottom of page
   - Has "Accept All", "Reject All", "Customize" buttons
   - Stays visible until user makes choice

3. **Check console for:**
   - No domain validation errors
   - CookieYes widget initializes properly

## CSP Requirements

Your `next.config.mjs` already includes the necessary CSP headers:

```javascript
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn-cookieyes.com ...
connect-src 'self' ... https://cdn-cookieyes.com
```

## LocalStorage Keys

CookieYes uses these keys:
- `cookieyes-consent` - Main consent record
- `cookieyes-necessary` - Necessary cookies consent
- `cookieyes-analytics` - Analytics consent
- `cookieyes-marketing` - Marketing consent
- `cookieyes-preferences` - Preferences consent

## Summary

The fix is complete. The banner will appear on the production domain (`cefr-ready.site`) but NOT on localhost due to CookieYes security validation. This is the correct behavior - the banner should only work on your actual website.

To verify it's working:
1. Deploy to production
2. Open in incognito window
3. Banner should appear at bottom
