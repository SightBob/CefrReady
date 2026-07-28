# Security Best Practices Report — CefrReady

**Report version:** 2.0 (supersedes v1.0 from 2026-06-20, recoverable via git)
**Date:** 2026-07-28
**Scope:** Full codebase audit (auth, API routes, DB, CSP/headers, XSS, rate limiting, secrets)
**Method:** Automated agent audit + manual verification of all CRITICAL/HIGH findings against source.

## Executive Summary

The application has a solid foundation: all 28 admin API handlers are guarded by `requireAdmin()` with a fail-closed Origin/Referer CSRF check, IDOR ownership checks are present on all user-data endpoints, admin-authored HTML is DOMPurify-sanitized at every render site, `npm audit` shows 0 vulnerabilities, and rate limiting correctly prefers platform-trusted IP headers.

However, there are **2 critical issue groups** requiring immediate action:

1. **The question bank's answers and explanations are exposed pre-submission** through multiple public/authenticated endpoints, allowing anyone to harvest the entire answer key or score 100% by reading network responses.
2. **The CSP allows `'unsafe-inline'` and `'unsafe-eval'`**, nullifying most of its XSS protection.

(A third finding — a database credential committed in `tmp_db_url.txt` — was verified on 2026-07-28 to be a stale, already-rotated password. No active compromise; see C1 for residual cleanup.)

---

## CRITICAL

### C1. ~~Live~~ Stale Neon database credentials committed to git — **MITIGATED (verified 2026-07-28)**

- **File:** `tmp_db_url.txt:1` (tracked in git, confirmed via `git ls-files`)
- **Status:** Owner verified the committed password is **no longer the current credential** (already rotated). No active compromise.
- **Residual risk:** Old credential remains visible in git history — still worth purging so future leaks don't accumulate, and the file shouldn't stay tracked.
- **Remaining fix (low urgency):**
  1. Purge the file from git history: `git filter-repo --path tmp_db_url.txt --invert-paths`, then force-push (irreversible — coordinate with collaborators first).
  2. Add `tmp_*.txt` to `.gitignore`.
  3. Also untrack `check-output.txt` and `ฉากเริ่มต้น - 2026-05-30.zip` (internal QA data + personal screen recordings, not credentials but should not be in the repo).

### C2. Unauthenticated endpoint dumps entire question bank with answers — **FIXED 2026-07-28**

- **File:** `src/app/api/tests/[type]/route.ts`
- **Impact (original):** `GET /api/tests/focus-form?demo=true&count=10000` returned `correctAnswer` + `explanation` for every question with no auth and no rate limit; `count` was unbounded.
- **Fix applied:** IP rate limit added (30 req/min via `checkIpThrottle`), `count` clamped to 1–50 (NaN → 400), demo mode capped at 10 questions.
- **Residual risk (accepted):** `demo=true` still returns answers unauthenticated for up to 10 questions per request — this is the intended product feature behind the public `/demo/*` pages. Combined with the rate limit, full-bank scraping is no longer practical. Complete answer-leak closure lands with C3's sanitizer work.

### C3. Answer keys leak in pre-submission question payloads — **FIXED 2026-07-28** (one accepted residual)

- **Files:**
  - `src/app/api/tests/[type]/route.ts:59` — `baseSelect` always includes `questions.article`; for `form-meaning` (cloze) questions, `article.blanks[].correctAnswer` is inside that JSON, so even **without** `demo=true` cloze answers are exposed unauthenticated.
  - `src/app/api/test-sets/[id]/route.ts:55-56` — any authenticated user (free Google sign-in) gets `correctAnswer` + `explanation` for all questions in a set before submitting.
  - `src/app/api/tests/full/start/route.ts:117`, `src/app/api/tests/full/next/route.ts:139,293`, `src/app/api/tests/full/resume/route.ts:99` — adaptive full-test returns the raw DB question row (`question: selection.question`) including `correctAnswer`, `explanation`, and answer-bearing `article` JSON.
- **Impact:** Any user can score 100% by reading DevTools network responses; the adaptive test's level estimation becomes meaningless. Sequential integer IDs (schema uses `serial`) make enumeration trivial.
- **Fix applied (phase 1):** new shared helper `src/lib/sanitize-question.ts` (`sanitizeQuestionForClient` / `sanitizeArticleForClient`) strips `correctAnswer`/`explanation` and `article.blanks[].correctAnswer`. Applied to: full-test `start`, `next` (both return paths), `resume`, and non-demo mode of `tests/[type]`. Full-test exam UI verified to not use client-side answers (`correctAnswer={null}` throughout `tests/full/exam/page.tsx`) — no regression. Build passes.
- **Residual (accepted by owner 2026-07-28):** `test-sets/[id]` intentionally keeps sending answers pre-submission because the practice-test page (`tests/[sectionId]/[setId]/page.tsx`) uses them for immediate per-question feedback, post-submit review display, and a local-scoring fallback when submit fails. Owner accepted the risk: practice-set cheating harms only the cheater, while the placement-relevant paths (full-test, adaptive) are now sanitized. Revisit if practice-set integrity becomes business-critical (options: per-answer server check endpoint, or post-submit-only reveal).

---

## MEDIUM

### M1. CSP `script-src` allows `'unsafe-inline' 'unsafe-eval'` — **FIXED 2026-07-28**

- **File:** `next.config.mjs:52` (original)
- **Impact (original):** Any successful content injection executes — the CSP provided almost no XSS protection.
- **Fix applied:** CSP moved out of static config into per-request nonce generation in `src/proxy.ts` (builder in `src/lib/csp.ts`). `unsafe-eval` is now dev-only; `unsafe-inline` remains solely as a legacy-browser fallback (modern browsers ignore it when a nonce is present). Nonce is forwarded via the `x-nonce` request header and applied to inline scripts: `JsonLd.tsx` (all JSON-LD) and the GA bootstrap in `GoogleAnalyticsLazy.tsx` (via root `layout.tsx`). API routes get a restrictive static CSP (`default-src 'none'; frame-ancestors 'none'`). `cdn-cookieyes.com` added to script/connect-src (was missing — CookieYes was silently blocked by the old CSP). Verified via build + runtime smoke test (page nonce, API CSP, HTML nonce attributes all correct).
- **Trade-off (accepted):** pages rendering the root layout/JsonLd are now dynamically rendered (ƒ) instead of static (○) — the standard cost of nonce-based CSP in Next.js.

### M2. ~~Missing middleware defense-in-depth~~ — **NOT AN ISSUE (corrected 2026-07-28)**

- **Original finding:** `src/middleware.ts` does not exist, so the `authorized()` callback in `auth.config.ts` was thought to be dead code.
- **Correction:** the project uses Next.js 16's `src/proxy.ts` (the middleware replacement), which runs NextAuth `authorized()` on all non-API routes (matcher excludes only `api`, static assets, and files). `/admin/*` pages therefore have two layers: the proxy check plus the server-component check in `src/app/admin/layout.tsx:12-16`; `/api/admin/*` handlers each call `requireAdmin()`. Defense-in-depth is present. Only remaining nit: CLAUDE.md still references `src/middleware.ts` — update docs to say `src/proxy.ts`.

### M3. Public DB-backed endpoints lack rate limiting — **FIXED 2026-07-28**

- **Files:** `src/app/api/vocabularies/route.ts`, `src/app/api/articles/route.ts`, `src/app/api/articles/[slug]/route.ts`, `src/app/api/sections/route.ts`, `src/app/api/health/route.ts`.
- **Fix applied:** `checkIpThrottle()` added to all five. Vocabularies (uncached `ilike`, most abusable) limited to 30 req/min; articles/sections use the default 100 req/min (cached); health gets a generous 120 req/min so uptime monitors are unaffected.

---

## LOW

| ID | File:Line | Issue | Fix |
|----|-----------|-------|-----|
| L1 | ~~`src/app/api/admin/users/route.ts`~~ **FIXED 2026-07-28** | DELETE takes `userId` from an unvalidated JSON body (no Zod); no self-demotion / bootstrap-admin guard (unlike PATCH at `users/[id]/route.ts:34-47`) | Zod schema + not-found check + same bootstrap-admin / self-delete guards added |
| L2 | ~~`src/app/api/tests/submit/route.ts`~~ **FIXED 2026-07-28** | Client-supplied `startedAt` trusted (forgeable durations); `testSetId` not validated against `testTypeId` (cross-set submissions pollute stats) | `startedAt` clamped to `<= now`; set/type mismatch rejected with 400 |
| L3 | `src/app/api/tests/full/submit/route.ts:35-45` | Internal `err.message` returned to clients on 500 | Generic message for 500s |
| L4 | ~~`src/components/JsonLd.tsx:11`~~ **FIXED 2026-07-28** (with M1) | `JSON.stringify(data)` into `<script>` via `dangerouslySetInnerHTML` — `</script>` inside a string value breaks out | Escaped `<` → `<` + nonce attribute added |
| L5 | ~~`src/app/api/admin/export/route.ts`~~ **FIXED 2026-07-28** | CSV export doesn't escape formula-injection chars (`=`, `+`, `-`, `@`) in user-controlled names | Dangerous leading chars prefixed with `'` |
| L6 | `src/lib/rate-limit.ts:34-37` | Rate limiter fails open on Redis outage — all limits vanish during an Upstash incident | Fail closed for the most sensitive endpoints (test fetch/submit) |
| L7 | `src/app/api/auth/*` (NextAuth handler) | No application-level rate limit on sign-in/callback endpoints | Low risk (NextAuth has CSRF/state), consider light IP throttle |
| L8 | ~~`next.config.mjs:6`~~ **FIXED 2026-07-28** | `allowedDevOrigins` contains an ngrok domain | Hardcoded domain removed; tunnel dev now works via `NGROK_ORIGIN` env var in `.env.local` (documented in `.env.example`) |
| L9 | ~~`src/lib/auth.ts:58-68`~~ **FIXED 2026-07-28** | JWT `isAdmin` refreshed only at sign-in; a demoted admin keeps access until token expiry | `requireAdmin()` now re-checks `users.isAdmin` in the DB on every call (bootstrap email still passes as recovery path) |

---

## INFO (verified clean)

- **Admin guard coverage:** all 28 `/api/admin/*` route files call `requireAdmin()`, which includes a fail-closed Origin/Referer CSRF check (`src/lib/admin-auth.ts:7-36`, `src/lib/origin-security.ts`).
- **IDOR:** ownership verified on `tests/attempts/[attemptId]` (:38-41), `tests/full/result/[attemptId]` (:47), `tests/feedback` (:57-62), `progress` (:21,32), `contacts` (:28,36).
- **XSS:** admin-authored article HTML rendered through DOMPurify with a strict tag/attr allow-list at all 6 render sites (`src/components/MarkdownContent.tsx:19-22`); editor preview also sanitized; no `eval`/`new Function`/raw `innerHTML` in `src/`.
- **Injection:** no raw SQL with user-input interpolation anywhere; all `sql`` ` usages interpolate only Drizzle column refs.
- **Secrets in code:** no hardcoded keys in `src/`; `.env`/`.env.vercel` correctly gitignored; `.env.example` placeholders only.
- **Boot hardening:** `src/instrumentation.ts:18-26` refuses production boot with weak/missing `NEXTAUTH_SECRET`; `src/db/index.ts:5-7` refuses boot without `DATABASE_URL`.
- **Rate-limit infra:** prefers platform-trusted `x-vercel-forwarded-for`/`x-real-ip` over spoofable `x-forwarded-for` (`src/lib/rate-limit.ts:59-65`).
- **Audio upload:** admin-only, MIME allow-list, 10MB cap, sanitized filenames (`src/app/api/admin/upload-audio/route.ts`).
- **Dictionary proxy:** throttled before upstream fan-out, strict word regex, fixed hosts (`src/app/api/dictionary/route.ts`).
- **Dependencies:** `npm audit --omit=dev` → 0 vulnerabilities.
- **Contacts API:** auth + per-user 3/min & 10/day limits + Zod (`src/app/api/contacts/route.ts:51-63`).

---

## Recommended fix order

1. **Today:** Lock down `/api/tests/[type]` — remove/auth-gate `demo`, clamp `count`, add rate limit (C2). Ship `sanitizeQuestionForClient()` across the five leaking routes (C3).
2. **This week:** Nonce-based CSP (M1); restore middleware or fix docs (M2); throttle vocabularies endpoint (M3).
3. **Backlog:** L1–L9; C1 git-history purge when convenient (credential already rotated — no urgency).
