# Web Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CEFR Ready feel fast on mobile by improving LCP, INP, CLS, TTFB, JavaScript cost, and quiz runtime without changing test or payment behavior.

**Architecture:** Measure first, then optimize the public landing path, global client providers, database reads, quiz runtime, and media delivery in separate reversible batches. Keep server components as the default, isolate optional browser features behind dynamic boundaries, and add repeatable performance budgets so regressions fail before deployment.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Drizzle/PostgreSQL, Vitest, Lighthouse, Vercel Analytics/Speed Insights

---

## Current baseline from the repository

- Shared first-load JavaScript reported by `next build`: about **88.3 kB**.
- Key routes: `/` about **105 kB**, `/tests/[sectionId]/[setId]` about **119 kB**, `/progress` about **116 kB**, `/review/[attemptId]` about **126 kB**.
- `src/app/layout.tsx` mounts Session, PostHog, promo, CookieYes, GA, Vercel Analytics, Speed Insights, top loader, and toaster globally.
- `src/app/page.tsx` calls `auth()` and PostgreSQL for personalized progress, making the public landing route dynamic.
- `src/app/progress/page.tsx` waits for authentication and four database queries. The overall aggregate duplicates data already loaded from `userProgress`, while the test-type query loads every row.
- `src/app/progress/ProgressContent.tsx` is a 17 kB client component; charts are deferred, but the whole dashboard still hydrates before they appear.
- The regular quiz route awaits `auth()` and only then calls `getTestSetCached()`, creating an avoidable server waterfall.
- `SetQuizClient.tsx` is about 28 kB and `TestLayout.tsx` about 33 kB. Timer/navigation/answer updates can therefore invalidate a wide client tree.
- Large interactive surfaces include `TestLayout.tsx`, `SetQuizClient.tsx`, `MustKnowClient.tsx`, full-test exam, review, and admin pages.
- Recharts is already dynamically loaded on progress/admin routes; this pattern should be preserved.
- Large audio files exist under `public/audio`, including duplicate-looking listening assets; production audio also supports R2.

## Performance budgets

| Metric | Mobile target |
|---|---:|
| LCP | ≤ 2.5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0.10 |
| TTFB public pages | ≤ 800 ms |
| Shared first-load JS | ≤ 90 kB initially; target ≤ 75 kB |
| Route first-load JS | ≤ 120 kB |
| Third-party JS before interaction | ≤ 120 kB |
| Above-the-fold images | ≤ 300 kB |

### Task 1: Establish reproducible measurements

**Files:**
- Modify: `package.json`
- Create: `scripts/performance-budget.mjs`
- Create: `docs/performance-baseline.md`

- [ ] **Step 1: Add measurement commands**

Add scripts:

```json
{
  "perf:build": "cross-env ANALYZE=true next build",
  "perf:lighthouse": "lighthouse http://localhost:3000 --preset=desktop --output=json --output-path=.performance/lighthouse.json",
  "perf:budget": "node scripts/performance-budget.mjs"
}
```

Install exact development tools:

```bash
npm install --save-dev @next/bundle-analyzer lighthouse cross-env
```

- [ ] **Step 2: Enable bundle analysis only when requested**

Wrap `next.config.mjs`:

```js
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

- [ ] **Step 3: Record the baseline**

Measure `/`, `/tests`, one quiz route, `/progress`, and `/review/{attemptId}` on a throttled mobile profile. Record LCP, INP/TBT, CLS, TTFB, transferred bytes, and largest client chunks in `docs/performance-baseline.md`.

- [ ] **Step 4: Add a budget check**

`scripts/performance-budget.mjs` must parse `.performance/lighthouse.json`, fail when LCP exceeds 2500 ms or CLS exceeds 0.10, and print the measured values.

- [ ] **Step 5: Verify**

```bash
npm run test:unit
npm run build
npm run perf:budget
```

Commit: `perf: add reproducible performance baseline`

### Task 2: Make Progress data arrive faster

**Files:**
- Modify: `src/app/progress/page.tsx`
- Create: `src/lib/progress-summary.ts`
- Test: `src/lib/progress-summary.test.ts`

- [ ] **Step 1: Add server timing around the Progress phases**

Measure authentication and data loading separately:

```ts
const startedAt = performance.now();
const session = await auth();
const authMs = performance.now() - startedAt;

const dataStartedAt = performance.now();
const progress = await getProgressSummary(session.user.id);
const dataMs = performance.now() - dataStartedAt;

console.info('[perf/progress]', { authMs, dataMs });
```

Keep this diagnostic development-only and capture five warm and five cold requests before changing queries.

- [ ] **Step 2: Write tests for a pure summary formatter**

Cover empty progress, weighted average, missing test-type metadata, invalid numeric values, and recent-attempt ordering. The formatter must accept loaded rows and return the existing `ProgressData` shape.

- [ ] **Step 3: Remove the redundant aggregate query**

Compute totals from `progressByType` in one pass:

```ts
const totals = progressRows.reduce(
  (acc, row) => {
    const count = row.testsTaken ?? 0;
    const score = Number(row.averageScore) || 0;
    acc.testsTaken += count;
    acc.weightedScore += score * count;
    return acc;
  },
  { testsTaken: 0, weightedScore: 0 }
);
```

This reduces four database reads to three without changing results.

- [ ] **Step 4: Stop loading the entire test-types table**

Join `testAttempts` to `testTypes` in the recent-attempt query and select the name directly. Remove `db.select().from(testTypes)`.

- [ ] **Step 5: Verify database indexes**

Use `EXPLAIN (ANALYZE, BUFFERS)` for the recent-attempt query. Confirm an index supports:

```text
(user_id, status, completed_at DESC)
```

If it does not, add the composite index in `src/db/schema.ts`, generate a Drizzle migration, and re-run the query plan.

- [ ] **Step 6: Render useful content before charts**

Keep summary cards and recent history server-visible immediately. Defer only Recharts and Smart Insights; do not hold both behind a fixed 300–1500 ms idle timer. Use an `IntersectionObserver` boundary so chart code loads shortly before the analytics section enters the viewport.

- [ ] **Step 7: Verify**

Targets: Progress server data ≤ 300 ms warm, first useful dashboard content without waiting for Recharts, route JS ≤ 105 kB.

```bash
npm run test:unit
npm run build
```

Commit: `perf: reduce progress queries and defer charts`

### Task 3: Remove the Quiz server waterfall and shrink its payload

**Files:**
- Modify: `src/app/tests/[sectionId]/[setId]/page.tsx`
- Modify: `src/lib/test-set.ts`
- Modify: `src/app/api/tests/submit/route.ts`
- Test: `src/lib/test-set.test.ts`

- [ ] **Step 1: Measure authentication and test-set loading**

Record `authMs`, `testSetMs`, cache hit behavior, serialized question payload bytes, and total route TTFB for five requests.

- [ ] **Step 2: Validate params before starting work**

Parse `setId` first, then start independent work concurrently:

```ts
const [session, data] = await Promise.all([
  auth(),
  getTestSetCached(setId),
]);
```

- [ ] **Step 3: Split public quiz payload from review payload**

Define a `QuizQuestion` type that excludes `correctAnswer`, `explanation`, and transcript fields not required before submission. Keep answer checking server-side and return review data only after a valid submission.

- [ ] **Step 4: Add payload-shape tests**

Assert that initial serialized questions never contain `correctAnswer` or `explanation`, while the authenticated submission response still contains review results.

- [ ] **Step 5: Narrow cache invalidation**

Use one cache tag per set:

```ts
tags: [`test-set:${setId}`]
```

Admin mutations should invalidate only the affected set rather than every cached test set.

- [ ] **Step 6: Verify**

Targets: cached Quiz TTFB ≤ 500 ms, initial payload reduced by at least 25%, and no answer key in initial HTML/RSC data.

Commit: `perf: parallelize quiz loading and reduce payload`

### Task 4: Reduce Quiz rerenders and interaction delay

**Files:**
- Modify: `src/app/tests/[sectionId]/[setId]/SetQuizClient.tsx`
- Modify: `src/components/TestLayout.tsx`
- Modify: `src/app/tests/full/exam/page.tsx`
- Modify: `src/components/ListeningAudioPlayer.tsx`
- Create: `src/components/test/QuestionRenderer.tsx`
- Create: `src/components/test/useTestSession.ts`
- Test: `src/components/test/useTestSession.test.ts`

- [ ] **Step 1: Profile interactions**

Record React Profiler traces for selecting an answer, moving to the next question, timer ticks, playing audio, opening text selection, and submitting. Record commit count and longest commit.

- [ ] **Step 2: Write reducer tests**

Cover answer selection, next/previous navigation, form-meaning blanks, timer expiry, resume state, and submit state before extracting logic.

- [ ] **Step 3: Separate state from rendering**

Move timer, answers, navigation, persistence, and submission into `useTestSession`. Keep `QuestionRenderer` responsible only for the active question.

- [ ] **Step 4: Isolate the timer**

Ensure one-second timer updates rerender only `TestTimer`. Store the deadline rather than decrementing shared quiz state every second.

- [ ] **Step 5: Prevent broad rerenders**

Memoize question cards and callbacks. Pass primitive props instead of the entire test session object:

```tsx
const handleAnswer = useCallback(
  (answer: string) => dispatch({ type: 'answer', questionId, answer }),
  [questionId]
);
```

- [ ] **Step 6: Load only the active question renderer**

Keep dynamic imports, but preload only the next question type. Do not load listening, conversation, selectable text, results, and tours at initial route entry when they are not needed.

- [ ] **Step 7: Disable expensive observability on test routes**

PostHog session recording must remain off on `/tests/*` and `/demo/*`. Batch analytics events outside the answer-click critical path.

- [ ] **Step 8: Verify**

Targets: INP ≤ 200 ms, timer tick causes no question-card commit, and navigation has no commit longer than 50 ms on a mid-range mobile profile.

Commit: `perf: isolate quiz state and reduce rerenders`

### Task 7: Make the public homepage cacheable

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/HomeProgressClient.tsx`
- Create: `src/app/api/progress/summary/route.ts`
- Test: `src/app/api/progress/summary/route.test.ts`

- [ ] **Step 1: Write a failing API test**

Cover anonymous `401`, authenticated aggregate output, and the empty-progress response:

```ts
expect(body).toEqual({
  success: true,
  data: { testsTaken: 0, averageScore: 0 },
});
```

- [ ] **Step 2: Move personalized progress behind an authenticated API**

Return only `testsTaken` and `averageScore`; apply the existing user rate limit and `Cache-Control: private, no-store`.

- [ ] **Step 3: Remove `auth()`, `db`, and Drizzle imports from `src/app/page.tsx`**

Replace the server `UserProgressSection` with:

```tsx
<Suspense fallback={null}>
  <HomeProgressClient />
</Suspense>
```

The client component should wait for `useSession()` to become authenticated before requesting `/api/progress/summary`.

- [ ] **Step 4: Confirm static rendering**

Run `npm run build` and verify `/` is marked `○` rather than `ƒ`. Compare anonymous homepage TTFB and LCP with Task 1.

- [ ] **Step 5: Verify and commit**

```bash
npm run test:unit
npm run build
```

Commit: `perf: make public homepage statically cacheable`

### Task 6: Reduce global JavaScript and third-party work

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/posthog.tsx`
- Modify: `src/components/GoogleAnalyticsLazy.tsx`
- Modify: `src/components/CookieYesScript.tsx`
- Modify: `src/components/PromoModalProvider.tsx`
- Create: `src/components/ClientObservability.tsx`

- [ ] **Step 1: Capture the current root bundle**

Use the analyzer to record how much `posthog-js`, NextAuth client code, CookieYes, GA, promo code, and `nextjs-toploader` contribute.

- [ ] **Step 2: Create one optional observability boundary**

`ClientObservability.tsx` should mount PostHog, GA, Vercel analytics, Speed Insights, promo, and toaster after consent/idle as applicable. Keep authentication functionality independent of analytics initialization.

- [ ] **Step 3: Remove production diagnostic logging**

Delete repeated `console.log` calls from CookieYes and promo components, or guard them:

```ts
if (process.env.NODE_ENV === 'development') {
  console.debug('[cookie-consent]', state);
}
```

- [ ] **Step 4: Stop session recording by default**

Keep `disable_session_recording: true`; only call `startSessionRecording()` after explicit analytics consent and never on `/tests/*`, `/demo/*`, checkout, or settings/export.

- [ ] **Step 5: Load route-specific features only where needed**

Move promo logic away from routes that cannot show it. Remove `NextTopLoader` if measurement shows it causes global hydration cost greater than its UX value.

- [ ] **Step 6: Verify**

Compare shared JS, main-thread time, and third-party transferred bytes against Task 1. Functional checks: login, GA pageview, consent, PostHog identify/reset, promo display.

Commit: `perf: defer global analytics and optional UI`

### Task 5: Cache public data and remove database waterfalls

**Files:**
- Modify: `src/app/api/articles/route.ts`
- Modify: `src/app/api/articles/[slug]/route.ts`
- Modify: `src/app/api/sections/route.ts`
- Modify: `src/app/api/vocabularies/route.ts`
- Modify: `src/app/tests/page.tsx`
- Modify: `src/app/tests/[sectionId]/page.tsx`
- Create: `src/lib/public-content-cache.ts`
- Test: `src/lib/public-content-cache.test.ts`

- [ ] **Step 1: Classify reads**

Keep user/session/progress/payment responses private and uncached. Mark articles, active sections, vocabularies, and published test metadata as public content.

- [ ] **Step 2: Centralize cached public queries**

Use Next.js server caching with stable keys and short revalidation:

```ts
export const getPublishedSections = unstable_cache(
  queryPublishedSections,
  ['published-sections'],
  { revalidate: 300, tags: ['sections'] }
);
```

- [ ] **Step 3: Invalidate after admin writes**

After successful create/update/delete operations, call `revalidateTag('sections')`, `revalidateTag('articles')`, or the matching content tag.

- [ ] **Step 4: Parallelize independent reads**

Replace sequential awaits with:

```ts
const [section, sets, progress] = await Promise.all([
  getSection(id),
  getSets(id),
  getProgress(userId, id),
]);
```

- [ ] **Step 5: Check query plans**

Run `EXPLAIN (ANALYZE, BUFFERS)` through Drizzle for the slowest route queries in staging. Add indexes through `src/db/schema.ts` plus generated migrations only when a measured sequential scan is responsible.

- [ ] **Step 6: Verify**

Measure warm/cold TTFB and database query count for `/`, `/tests`, section pages, articles, and progress.

Commit: `perf: cache public content and parallelize reads`

### Task 4B: Apply the Quiz runtime refactor to Full Test

**Files:**
- Modify: `src/app/tests/full/exam/page.tsx`
- Modify: `src/lib/full-test/algorithm.ts`
- Modify: `src/lib/full-test/submit-attempt.ts`
- Modify: `src/components/ListeningAudioPlayer.tsx`
- Create: `src/components/test/useFullTestSession.ts`
- Test: `src/components/test/useFullTestSession.test.ts`

- [ ] **Step 1: Profile interactions**

Record React Profiler and Network traces for start, next-question fetch, answer submission, timer ticks, resume, listening playback, and final submit.

- [ ] **Step 2: Write Full Test session tests**

Cover next-question state, optimistic loading guard, timer deadline, resume payload, cancellation, and final submission.

- [ ] **Step 3: Reuse the proven regular-Quiz boundaries**

Move orchestration into `useFullTestSession` while reusing `QuestionRenderer` from Task 4. Keep adaptive-level and scoring logic server-side.

- [ ] **Step 4: Prefetch only one next step**

Do not fetch multiple adaptive questions because the next level depends on the current answer. Prefetch renderer code and audio metadata only; keep question selection sequential and authoritative on the server.

- [ ] **Step 5: Isolate timer and network state**

Timer ticks must not rerender the question card. A pending `/next` request must disable duplicate submissions without blocking audio controls or the entire page.

- [ ] **Step 6: Verify**

INP target is ≤ 200 ms. Confirm all 45 questions, adaptive transitions, resume, cancel, timeout submit, result calculation, and review remain correct.

Commit: `perf: optimize full-test runtime`

### Task 8: Optimize audio and static assets

**Files:**
- Modify: `src/components/ListeningAudioPlayer.tsx`
- Modify: `src/lib/r2.ts`
- Modify: `next.config.mjs`
- Create: `scripts/audit-media.mjs`
- Modify or remove: measured duplicate files under `public/audio`

- [ ] **Step 1: Inventory media**

Hash every audio asset and report exact duplicates, bitrate, duration, and size. Do not delete files until database and CSV references are checked.

- [ ] **Step 2: Load only active audio**

Use `preload="metadata"` for the active question and `preload="none"` for inactive audio. Abort obsolete fetches when navigating.

- [ ] **Step 3: Normalize production delivery**

Serve listening media from R2 with:

```http
Cache-Control: public, max-age=31536000, immutable
Accept-Ranges: bytes
```

Use content-hashed object names before applying immutable caching.

- [ ] **Step 4: Remove confirmed duplicates**

Update database/CSV references first, verify playback, then remove duplicate local assets.

- [ ] **Step 5: Verify**

Test seeking, replay, mobile Safari playback, slow network behavior, and failed audio recovery.

Commit: `perf: optimize listening media delivery`

### Task 9: Enforce performance continuously

**Files:**
- Create: `.github/workflows/performance.yml` if GitHub Actions is used
- Modify: `package.json`
- Modify: `docs/performance-baseline.md`

- [ ] **Step 1: Run budgets on pull requests**

Build the application, start it, run Lighthouse against `/`, `/tests`, and `/demo`, then execute `npm run perf:budget`.

- [ ] **Step 2: Track field metrics**

Use Vercel Speed Insights for LCP/INP/CLS by route. Review p75 weekly; do not optimize solely from local Lighthouse scores.

- [ ] **Step 3: Add a release gate**

A release fails when tests/build fail, the route JS budget grows by more than 10%, or p75 LCP/INP regresses for two consecutive measurement windows.

- [ ] **Step 4: Final verification**

```bash
npm run test:unit
npm run build
npm run perf:lighthouse
npm run perf:budget
```

Commit: `ci: enforce web performance budgets`

## Recommended execution order

1. Task 1 — baseline focused on Progress and all Quiz variants.
2. Task 2 — reduce Progress queries and chart wait.
3. Task 3 — remove Quiz server waterfall and shrink payload.
4. Task 4 — isolate Quiz state, timer, and renderers.
5. Task 4B — apply proven runtime changes to Full Test.
6. Task 5 — cache shared public reads.
7. Task 6 — reduce global third-party/client JS.
8. Task 7 — optimize the homepage after the observed slow routes.
9. Task 8 — audio/media delivery.
10. Task 9 — regression protection.

Do not combine Tasks 2–6 into one release. Measure after every task and keep a change only when its target metric improves without breaking authentication, tests, payments, or analytics consent.

## Implementation checkpoint — 2026-07-06

Completed in the first Progress/Quiz performance wave:

- Progress database reads reduced from four to two.
- Recent attempts now join their test-type names in the same query.
- Added and applied `test_attempts_user_status_completed_idx`.
- Progress charts mount near the viewport instead of after a fixed idle delay.
- Quiz authentication and cached test-set loading now run concurrently.
- Test-set metadata and question queries now run concurrently on a cold cache.
- Removed duplicate `selectedAnswer` state and stabilized quiz navigation handlers.
- Reduced two mounted quiz timers to one timer instance.
- Listening audio now preloads metadata instead of the full audio resource.
- Promo/PostHog React UI loads after idle and is skipped entirely on test, demo, and checkout routes.

Deliberate deviation:

- Initial quiz payload still contains answers and explanations because the current product shows feedback immediately after each answer. Removing those fields requires a separate product decision and either delayed feedback or an additional per-question API request; it was not bundled into this performance wave.
