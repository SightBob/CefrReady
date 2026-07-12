# Feedback Discovery Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time, accessible home-page modal that tells authenticated users where to send problems and suggestions without overlapping the existing product tour.

**Architecture:** A dedicated client component owns session gating, local persistence, dialog focus behavior, and navigation. `HomeTour` emits a small browser event at completion so the independently mounted modal can wait without coupling the two component APIs.

**Tech Stack:** Next.js 14 App Router, React 18, NextAuth v5, Tailwind CSS, Lucide React, Vitest

---

## File map

- Create `src/components/FeedbackDiscoveryModal.tsx`: modal trigger, persistence, focus management, and UI.
- Create `src/components/feedback-discovery.test.ts`: unit coverage for trigger decision rules.
- Create `src/lib/feedback-discovery.ts`: pure constants and trigger-decision helper used by the component and tests.
- Modify `src/components/HomeTour.tsx`: emit a completion event after closing the tour.
- Modify `src/app/page.tsx`: mount the modal after `HomeTour`.

### Task 1: Define and test the modal trigger rules

**Files:**
- Create: `src/lib/feedback-discovery.ts`
- Create: `src/components/feedback-discovery.test.ts`

- [ ] **Step 1: Write failing decision-rule tests**

Create a Vitest table covering the complete trigger matrix:

```ts
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
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `npx vitest run src/components/feedback-discovery.test.ts`

Expected: FAIL because `@/lib/feedback-discovery` does not exist.

- [ ] **Step 3: Implement the pure helper and shared constants**

Create `src/lib/feedback-discovery.ts`:

```ts
export const FEEDBACK_DISCOVERY_SEEN_KEY = 'cefrready-feedback-modal-seen';
export const HOME_TOUR_COMPLETED_KEY = 'cefrready-tour-completed';
export const HOME_TOUR_FINISHED_EVENT = 'cefrready-tour-finished';

interface FeedbackDiscoveryState {
  authenticated: boolean;
  seen: boolean;
  tourCompleted: boolean;
}

export function shouldShowFeedbackDiscovery({
  authenticated,
  seen,
  tourCompleted,
}: FeedbackDiscoveryState) {
  return authenticated && !seen && tourCompleted;
}
```

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run src/components/feedback-discovery.test.ts`

Expected: 4 cases PASS.

### Task 2: Implement and integrate the accessible modal

**Files:**
- Create: `src/components/FeedbackDiscoveryModal.tsx`
- Modify: `src/components/HomeTour.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Emit the tour-finished event**

Import `HOME_TOUR_FINISHED_EVENT` into `HomeTour.tsx` and extend its existing completion handler:

```ts
const handleComplete = () => {
  setShowTour(false);
  setForceOpen(false);
  window.dispatchEvent(new Event(HOME_TOUR_FINISHED_EVENT));
};
```

The replay flow uses the same handler, so replaying the tour cannot leave the discovery modal permanently waiting.

- [ ] **Step 2: Implement session, persistence, and timing behavior**

Create a client component using `useSession`, `useRouter`, `useEffect`, `useRef`, and `useState`. On authenticated status, read both storage keys. If the helper returns true, open after 500 ms. Otherwise listen for `HOME_TOUR_FINISHED_EVENT`, re-read the seen key, and open after 500 ms. Store a mounted-session ref so unavailable local storage cannot cause repeated openings.

Use this shared close path for the close icon, backdrop, Escape, and secondary action:

```ts
const markSeenAndClose = useCallback(() => {
  shownThisMount.current = true;
  try { localStorage.setItem(FEEDBACK_DISCOVERY_SEEN_KEY, 'true'); } catch { /* ignore */ }
  setOpen(false);
}, []);

const handleGoToFeedback = () => {
  markSeenAndClose();
  router.push('/contact');
};
```

Every timer and event listener must be removed in the effect cleanup.

- [ ] **Step 3: Implement accessible dialog mechanics**

When open, save `document.activeElement`, focus the primary action, preserve the prior `document.body.style.overflow`, and restore both on cleanup. Add one keydown listener that closes on Escape and traps Tab/Shift+Tab between dialog buttons. Use a dialog ref and select focusable enabled buttons inside it.

The overlay must use:

```tsx
<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
  <button
    type="button"
    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
    aria-label="ปิดหน้าต่างความคิดเห็น"
    onClick={markSeenAndClose}
  />
  <section
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="feedback-discovery-title"
    aria-describedby="feedback-discovery-description"
    className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl"
  >
    {/* MessageSquare icon, title, description, close icon, and two actions */}
  </section>
</div>
```

Render exact copy and labels from the approved design. The primary button calls `handleGoToFeedback`; the secondary and close icon call `markSeenAndClose`.

- [ ] **Step 4: Mount after the home tour**

Import `FeedbackDiscoveryModal` in `src/app/page.tsx` and render it immediately after `<HomeTour />`:

```tsx
<HomeTour />
<FeedbackDiscoveryModal />
```

- [ ] **Step 5: Run automated verification**

Run:

```powershell
npx vitest run src/components/feedback-discovery.test.ts
npx tsc --noEmit
npm run build
```

Expected: focused tests, type checking, and production build all exit 0.

- [ ] **Step 6: Perform manual acceptance checks**

Run `npm run dev`, then verify:

1. Signed out home page never opens the discovery modal.
2. Signed in with `cefrready-tour-completed` absent: the product tour appears first and the modal appears only after it closes.
3. Signed in with the tour key present and feedback key absent: the modal appears once after a short delay.
4. Clicking backdrop, close icon, “ไว้ภายหลัง”, or pressing Escape writes `cefrready-feedback-modal-seen=true` and the modal stays closed after refresh.
5. Clicking “ส่งความคิดเห็น” writes the seen key and navigates to `/contact`.
6. Tab and Shift+Tab stay inside the dialog; closing returns focus to the previously focused element.

- [ ] **Step 7: Record the workspace limitation**

This workspace is not a Git repository, so no implementation commit, merge, or pull request can be created. Preserve all completed files in place and report verification results directly.
