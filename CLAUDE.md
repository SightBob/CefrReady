# CefrReady - Project Guide

## Overview

CefrReady is an English proficiency testing platform aligned with the CEFR (Common European Framework of Reference) standard. Users take grammar, vocabulary, cloze, and listening tests; the system estimates their CEFR level (A1–C2) and tracks progress over time. Includes flashcards with spaced repetition (SM-2), grammar articles, and an admin panel for content management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.4 (strict mode) |
| Styling | Tailwind CSS 3.4 + `@tailwindcss/typography` + `tailwindcss-animate` |
| Database | PostgreSQL (Neon serverless) via Drizzle ORM |
| Auth | NextAuth v5 beta — JWT strategy + Google OAuth |
| Cache | Upstash Redis (rate limiting) |
| Storage | Cloudflare R2 (audio files for listening tests) |
| Error Tracking | Sentry (conditional — only when `NEXT_PUBLIC_SENTRY_DSN` is set) |
| Analytics | Vercel Analytics + Google Analytics |
| Charts | Recharts |
| Validation | Zod |
| Deployment | Vercel |

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (also used as "test")
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migration from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:push      # Push schema directly (dev only)
npm run db:studio    # Drizzle Studio — visual DB browser
npm run db:seed      # Seed admin user
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (pages)/            # Public pages: /, /tests, /progress, /flashcards, etc.
│   ├── admin/              # Admin panel pages
│   ├── api/                # API route handlers
│   │   ├── admin/          # Admin-only endpoints (guarded by requireAdmin)
│   │   └── tests/          # Public test endpoints
│   ├── layout.tsx          # Root layout (fonts, metadata)
│   └── globals.css         # Global styles + Tailwind
├── components/             # React components
├── db/
│   ├── schema.ts           # All Drizzle table definitions
│   └── index.ts            # DB connection (Neon serverless)
├── lib/
│   ├── auth.ts             # Full NextAuth config (server-side, uses DB)
│   ├── auth.config.ts      # Edge-safe auth config (no DB imports)
│   ├── admin-auth.ts       # requireAdmin() helper for API routes
│   ├── sm2.ts              # SM-2 spaced repetition algorithm
│   └── rate-limit.ts       # Upstash rate limiting
├── middleware.ts            # Edge middleware — route protection
└── types/                  # Shared TypeScript types
```

## Key Architecture Decisions

### Auth Split (Edge vs Server)

Auth is split into two files to work around Edge Runtime limitations:

- **`src/lib/auth.config.ts`** — Edge-safe. No DB imports. Used by `middleware.ts` for route protection via `authorized()` callback.
- **`src/lib/auth.ts`** — Full config with DrizzleAdapter. Imports `authConfig` and adds JWT callbacks + DB adapter. Used by server components and API routes.

JWT strategy is used (not database sessions) so middleware can verify sessions without querying the DB on every request. The adapter still handles OAuth account linking and user creation.

### Admin Authorization

- Admin identity: single email check against `pawatsaekoo@gmail.com`
- `isAdmin` flag stored in JWT token during sign-in
- Middleware blocks `/admin/*` routes for non-admins
- API routes under `/api/admin/*` use `requireAdmin()` from `src/lib/admin-auth.ts`

### Database

- All tables defined in single file: `src/db/schema.ts`
- Migrations in `drizzle/` directory
- Connection via Neon serverless driver (`@neondatabase/serverless`)
- `AnyTable` type assertion required for DrizzleAdapter compatibility (known issue with NextAuth v5 + Drizzle)

### Content & Testing Model

- **Test Types**: `focus-form` (grammar), `focus-meaning` (vocabulary), `form-meaning` (cloze), `listening`
- **Test Sets**: groups of ~20 questions per section
- **Questions**: linked to articles and test sets via junction tables
- **SM-2 Algorithm**: `src/lib/sm2.ts` — quality ratings 1/3/4/5, ease factor min 1.3, status flow: `new` → `learning` → `mastered`

### Security Headers

CSP and security headers configured in `next.config.mjs`. Key allowed origins:
- Google OAuth, Google Analytics, Google Fonts
- Cloudflare R2 for media (`pub-e915c92ac05f48ccabfe327469bf4599.r2.dev`)
- Vercel Analytics scripts

When adding external scripts/resources, update the CSP headers in `next.config.mjs`.

## Conventions

### File Naming
- Path alias: `@/*` maps to `src/*`
- Pages: `page.tsx`, Layouts: `layout.tsx`, API: `route.ts`
- Dynamic routes: `[param]/page.tsx`

### API Routes
- Zod validation on request bodies
- RESTful: `GET/POST/PATCH/DELETE` per resource
- Admin routes under `/api/admin/*` with `requireAdmin()` guard
- Public routes under `/api/*`

### Styling
- Custom fonts: **Prompt** (Thai-compatible sans), **Pridi** (serif)
- Custom colors: `primary` (sky-blue scale), `accent` (fuchsia/pink scale)
- Custom animations: `fade-in`, `slide-up`, `pulse-slow`
- Tailwind classes only — no CSS modules

### Components
- Client components explicitly marked with `"use client"`
- Large client components: `TestLayout.tsx` (~35KB), `FlashcardsClient.tsx` (~31KB), `MustKnowClient.tsx` (~17KB)
- Admin editor components in `src/components/` (e.g., `GrammarArticleEditor.tsx`)

## Environment Variables

Required for full functionality:

```
DATABASE_URL             # Neon PostgreSQL connection string
GOOGLE_CLIENT_ID         # Google OAuth
GOOGLE_CLIENT_SECRET     # Google OAuth
NEXTAUTH_SECRET          # JWT signing key
NEXTAUTH_URL             # App URL
UPSTASH_REDIS_REST_URL   # Rate limiting
UPSTASH_REDIS_REST_TOKEN # Rate limiting
NEXT_PUBLIC_SENTRY_DSN   # Optional — enables Sentry
SENTRY_ORG               # Optional — Sentry org
SENTRY_PROJECT           # Optional — Sentry project
```

## SEO

- JSON-LD structured data (WebSite, Organization, Course, Quiz, Article, FAQ)
- OpenGraph + Twitter card metadata on pages
- Sitemap and robots.txt
- Google Search Console verification

## Common Tasks

### Adding a new test question field
1. Update schema in `src/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply
4. Update related API routes and components

### Adding a new page
1. Create directory under `src/app/` with `page.tsx`
2. Add metadata export for SEO
3. If protected, add route to `src/middleware.ts` matcher

### Adding an admin API endpoint
1. Create route under `src/app/api/admin/[resource]/route.ts`
2. Import and call `requireAdmin()` at the top of each handler
3. Validate request body with Zod
4. Use Drizzle ORM for DB operations

## Rules
- Never use `any` type — use proper TypeScript types or `unknown`
- Always use Drizzle ORM — no raw SQL queries
- Never import from `src/lib/auth.ts` in middleware or Edge functions
- Always call `requireAdmin()` at the top of admin API handlers

## Current Focus
Working on: [ใส่ feature ที่กำลังทำ]

## Known Issues / Gotchas
- NextAuth v5 + DrizzleAdapter requires `as AnyTable` cast — already handled in `src/lib/auth.ts`
- Edge Runtime cannot import `src/lib/auth.ts` (has DB) — use `auth.config.ts` instead
- CSP headers must be updated in `next.config.mjs` when adding external scripts

## Testing
No unit test framework. Use `npm run build` to verify — it's the closest thing to a test pass.