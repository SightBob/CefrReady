# Board brief — CEFR Ready

You are a board member reviewing a real, live business. Read this whole brief, then read the lens file you were assigned. Do not ask for the conversation: this brief is everything.

## The business

**CEFR Ready** (https://cefr-ready.site) is a free Thai-language web app for practising CEFR English exams. It is live, in production, and currently free with no revenue.

- Four exam parts: Focus on Form (grammar), Focus on Meaning (vocabulary), Form & Meaning (cloze), Listening. Levels A1 to C2. Instant answer explanations after each test.
- Demo tests (5-9 questions) work without login. Full 30-question tests and progress tracking need a Google login.
- AI Tutor: a chat that explains why an answer is wrong, restricted by a system prompt so it teaches rather than just gives answers. Currently enabled on only 3 accounts as a trial.
- Admin panel for question bank, test sets, explanations, users, AI usage, plus a maintenance-mode switch.
- Tech: Next.js on Cloudflare Workers, PostgreSQL (Neon), Upstash Redis, Google OAuth, PostHog for analytics. Hosting cost is low.
- SEO is a deliberate channel: JSON-LD (Course, Quiz, FAQ, Article), sitemap, Search Console verified, and supporting content pages (`/cefr-levels`, `/cefr-vs-ielts`).

## The customer

Thai university students who must pass a CEFR exam to graduate, or who need a CEFR score for a job application or further study. The site started at Suranaree University of Technology (SUT), where CEFR is a graduation requirement. These students are typically 18-22, on a tight budget, price-sensitive, mobile-first, and they discover tools through search, TikTok, LINE groups and friends, not through email.

The pain is concrete and deadline-driven: fail the CEFR exam and you do not graduate. Re-sitting costs money and a semester. The homepage promise is "stop paying exam fees again and again, but still seeing no real result".

## Current status (measured, 23 Nov 2026)

- 1,427 user accounts, 183 new in the last 30 days. Free. Zero revenue. No payment system exists.
- 14,229 test attempts started, 13,226 completed (93%). Median 3 attempts per user. Top 10 users account for 22.6% of attempts.
- Question bank is 411 questions: A2 = 219 (53%), B1 = 122, A1 = 33, B2 = 27, C1 = 9, C2 = 1. Listening content exists only at A2.
- Blind check of answers: 39/40 correct (97.5%). Explanations for grammar items teach the actual rule with examples.
- 68.5% of completed attempts have no per-question answer records, so item difficulty and weak-topic analysis are unreliable right now.
- Adaptive question selection falls back to a default 67% of the time (12,537 fallback vs 6,106 exact) because the bank is too small.
- 61.6% of questions (253/411) have no grammar topic tag.
- AI Tutor: 3 accounts enabled out of 1,427; 32 real messages, all from one user.
- The pricing page says the site is free "while we improve the question bank, and we will announce any charge in advance". The homepage still says charging starts 30 Nov 2026. The two contradict each other.
- Some analytics rows look synthetic or back-filled (attempts before their user existed, completed_at before started_at), so usage figures are directional only.
- There is no pre/post test and no control group, so the site cannot yet prove a student improves. That proof is exactly what a paying customer would be buying.

## Constraints

- Effectively one developer, no marketing budget, no sales team, part-time capacity.
- No pricing, no checkout, no invoices, no support process for paid customers.
- Content is the bottleneck: creating good CEFR items and explanations is slow, manual work.
- The founder has decided not to touch the site's live/maintenance state while doing business analysis.

## What the board is being asked

The founder wants to know whether this can grow and make money from budget-limited Thai students, and specifically:
1. What is actually strong here.
2. What is weak or missing.
3. What could kill it.
4. Where the money could come from, given that the target customer has little money.

## Open questions (no numbers exist yet — name them, do not invent them)

- What Thai students already pay for CEFR prep (re-sit fees, tutors, books, other sites) and their willingness to pay.
- Cost to acquire one user, and which channel works (search, TikTok, LINE, university communities).
- How many students nationally sit a CEFR exam each year, and how many at SUT specifically.
- Whether universities or English departments would pay for a licence instead of students paying.
- Whether users actually pass their exam after using the site.

## Rules

- Score the business, not the founder.
- No invented facts, no invented market sizes, no invented competitor prices. If a number is missing, say it is an open question and name which later skill would answer it (`founder-competitors`, `founder-consumer`, `founder-cfo`, `founder-pricing`).
- Apply ONLY your assigned lens. Do not write the other lenses' arguments.
