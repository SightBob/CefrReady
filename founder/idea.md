# CEFR Ready

- What it is: A free web app for practising CEFR English exams, with instant answer explanations. Four exam parts (Focus on Form / grammar, Focus on Meaning / vocabulary, Form & Meaning / cloze, Listening), levels A1 to C2, demo tests without login, full tests and progress tracking with a Google login, plus an AI Tutor that explains answers.
- Who it is for: Thai university students who must pass a CEFR exam to graduate, or who need a CEFR score to apply for a job or for further study. The origin is Suranaree University of Technology (SUT), where CEFR is a graduation requirement.
- What it sells, at what price: Nothing yet. The whole product is free. The pricing page says free "while we improve the question bank, we will announce any charge in advance", while the homepage still carries copy about charging from 30 Nov 2026. No payment system is built.
- Where and how: Web only, at https://cefr-ready.site. Next.js on Cloudflare Workers, PostgreSQL (Neon) + Upstash Redis, Google OAuth. Users arrive from search (SEO is a deliberate strategy: JSON-LD schema, sitemap, Google Search Console verified, content pages on CEFR levels and CEFR vs IELTS). Admin panel manages questions, test sets, explanations, users and AI usage.
- Budget and constraints: Built and run by a very small team (effectively one developer). Hosting is cheap (Cloudflare + Neon free/low tiers). No marketing budget. No payments, no pricing, no sales process. Content is the bottleneck: 411 questions total, 53% of them A2, and only 10 questions at C1+C2 combined.

## Verified facts from the current build (23 Nov 2026 independent review, `docs/independent-review-2026-11-23.md`)

- Users: 1,427 accounts; 183 new users in the last 30 days. 1,221 of them (85.6%) have at least one attempt.
- Attempts: 14,229 started, 13,226 completed (93%), 808 cancelled, 195 in progress. Median 3 attempts per user. Top 10 users hold 22.6% of all attempts.
- Question bank: 411 questions. A2 = 219 (53%), B1 = 122, A1 = 33, B2 = 27, C1 = 9, C2 = 1. Listening exists only at A2 (36 questions).
- Answer correctness: blind test 39/40 correct (97.5%).
- Learning evidence gap: 68.5% of completed attempts (9,059) have no per-question answer rows, so per-item difficulty and weak-topic analysis are not reliable yet.
- Adaptive selection falls back 67% of the time (12,537 fallback vs 6,106 exact) because the bank is too thin.
- 253 of 411 questions (61.6%) have no grammar topic, so weak-topic grouping is impossible.
- AI Tutor: enabled on 3 accounts out of 1,427; 32 real messages from 1 user.
- Pricing copy contradicts itself: homepage says charging starts 30 Nov 2026, `/packages` says free with advance notice.
- Analytics data has synthetic/backfill traces (7 attempts before their user existed, 4 attempts with completed_at before started_at), so usage numbers are directionally useful, not clean.
- No pre/post test, no control group: the site cannot yet prove a student actually improves.

## Open questions (nobody has these numbers yet)

- Willingness to pay of Thai students for exam prep, and what they already pay (exam re-sit fees, tutors, books, other prep sites).
- Real acquisition cost per user and which channel works (search, TikTok, LINE, university groups).
- How many students nationally sit a CEFR exam per year, and how many are at SUT specifically.
- Whether universities or English departments would pay for a licence (B2B2C) rather than students paying.
- Whether students pass after using the site (the outcome that is actually sold).
