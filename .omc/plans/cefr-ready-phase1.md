# CEFR Ready - Implementation Plan (Phase 1)

## Overview
Build a production-ready CEFR-aligned English proficiency testing platform.

**Current State**: Frontend UI complete, database schema defined, but authentication and data connections are stub implementations.

---

## Phase 1A: Authentication System (P0 - Critical)

### Task 1.1: NextAuth.js Setup
**File**: `src/lib/auth.ts` (new), `src/app/api/auth/[...nextauth]/route.ts` (update)

**Steps**:
1. Install dependencies: `next-auth`, `@auth/drizzle-adapter`
2. Create auth configuration with Google OAuth provider
3. Implement Drizzle adapter for database sessions
4. Add environment variables to `.env.example`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

**Acceptance Criteria**:
- [ ] Google OAuth login works end-to-end
- [ ] Sessions stored in database
- [ ] User data persisted to `users` table

---

### Task 1.2: Auth Middleware & Protection
**File**: `src/middleware.ts` (new), `src/lib/auth-utils.ts` (new)

**Steps**:
1. Create middleware to protect `/tests/*` routes
2. Create `getServerSession()` helper for server components
3. Create `useSession()` wrapper for client components
4. Update Header component to use real session

**Acceptance Criteria**:
- [ ] Unauthenticated users redirected to login on protected routes
- [ ] Header shows real user data from session
- [ ] Logout clears session properly

---

## Phase 1B: Question Bank & Test System (P0 - Critical)

### Task 2.1: Database Seed Script
**File**: `scripts/seed-admin.ts` (existing - complete implementation)

**Steps**:
1. Add sample questions for each test type (focus-form, focus-meaning, form-meaning, listening)
2. Include CEFR levels (A1-C2) distribution
3. Add test types metadata
4. Run seed: `npm run db:seed`

**Acceptance Criteria**:
- [ ] 100+ questions seeded across all test types
- [ ] Questions distributed across CEFR levels A1-C2
- [ ] Test types configured with icons/colors

---

### Task 2.2: Test API Routes
**File**: `src/app/api/tests/[type]/route.ts` (new)

**Steps**:
1. Create GET endpoint to fetch random questions by test type
2. Support `?count=N` parameter for question limit
3. Support `?cefrLevel=A1` filter
4. Exclude correct answer in API response (show only after submission)

**Acceptance Criteria**:
- [ ] Returns N random questions for test type
- [ ] Questions shuffled each request
- [ ] Correct answers hidden until submission

---

### Task 2.3: Test Submission API
**File**: `src/app/api/tests/submit/route.ts` (new)

**Steps**:
1. Accept answers array and test type
2. Calculate score by comparing with correct answers
3. Save test attempt to `testAttempts` table
4. Update `userProgress` aggregates
5. Return score with explanations

**Acceptance Criteria**:
- [ ] Score calculated correctly
- [ ] Test attempt saved with timestamp
- [ ] User progress updated (avg score, tests taken)

---

### Task 2.4: Update Test Pages
**File**: `src/app/tests/[type]/page.tsx` (update)

**Steps**:
1. Fetch questions from API on page load
2. Update TestLayout to use real questions
3. Handle submission with loading states
4. Show results with explanations after submission

**Acceptance Criteria**:
- [ ] Questions loaded from database
- [ ] Submission saves to database
- [ ] Results page shows score + explanations

---

## Phase 1C: Progress Tracking (P1 - High)

### Task 3.1: Progress API
**File**: `src/app/api/progress/route.ts` (new)

**Steps**:
1. Query userProgress for current user
2. Include recent testAttempts with details
3. Calculate statistics (average by category, improvement trend)

**Acceptance Criteria**:
- [ ] Returns user's progress by test type
- [ ] Includes last 10 test attempts
- [ ] Statistics calculated correctly

---

### Task 3.2: Update Progress Page
**File**: `src/app/progress/page.tsx` (update)

**Steps**:
1. Fetch real data from progress API
2. Display actual statistics instead of hardcoded values
3. Show test history with scores and dates
4. Add visual progress indicators

**Acceptance Criteria**:
- [ ] Stats reflect actual test performance
- [ ] Test history shows real attempts
- [ ] Loading states during fetch

---

## Phase 1D: Must Know Content (P1 - High)

### Task 4.1: Must Know Content Structure
**File**: `src/app/must-know/page.tsx` (update), `src/content/must-know/` (new)

**Steps**:
1. Create content structure for grammar rules
2. Create content structure for vocabulary lists
3. Organize by CEFR level
4. Render as static content or from database

**Acceptance Criteria**:
- [ ] Grammar reference by topic
- [ ] Vocabulary lists by CEFR level
- [ ] Searchable content

---

## Phase 1E: Admin Enhancement (P2 - Medium)

### Task 5.1: Test Types Management
**File**: `src/app/admin/test-types/page.tsx` (new), `src/app/api/admin/test-types/route.ts` (update)

**Steps**:
1. Create CRUD UI for test types
2. Add form for creating/editing test types
3. Implement soft delete (active flag)

**Acceptance Criteria**:
- [ ] Admin can create new test types
- [ ] Admin can edit existing test types
- [ ] Changes reflected in test listings

---

### Task 5.2: Bulk Import Questions
**File**: `src/app/admin/questions/import/page.tsx` (new), `src/app/api/admin/questions/import/route.ts` (new)

**Steps**:
1. Create CSV upload UI
2. Parse and validate question format
3. Bulk insert into questions table
4. Show import preview before commit

**Acceptance Criteria**:
- [ ] CSV template provided
- [ ] Validation errors shown before import
- [ ] Questions imported successfully

---

## Priority Order

| Priority | Phase | Tasks | Estimated Time |
|----------|-------|-------|----------------|
| P0 | 1A - Auth | 1.1, 1.2 | 2-3 days |
| P0 | 1B - Test System | 2.1, 2.2, 2.3, 2.4 | 4-5 days |
| P1 | 1C - Progress | 3.1, 3.2 | 2-3 days |
| P1 | 1D - Must Know | 4.1 | 1-2 days |
| P2 | 1E - Admin | 5.1, 5.2 | 2-3 days |

**Total Estimated Time**: 11-16 days

---

## Technical Decisions

1. **Auth**: NextAuth.js v5 (App Router compatible) with Google OAuth
2. **Database**: Drizzle ORM with PostgreSQL (existing)
3. **Session Strategy**: Database sessions (required for server components)
4. **Question Fetching**: Random selection with weighted CEFR distribution
5. **Progress Calculation**: Real-time aggregates on submission

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| NextAuth v5 breaking changes | Medium | Use latest docs, test thoroughly |
| Question seeding quality | Low | Review sample questions before bulk import |
| Performance on progress queries | Medium | Add database indexes on user_id, created_at |
| Listening test audio hosting | Low | Use Cloudflare R2 or similar for audio files |

---

## Next Steps (After Plan Approval)

1. **Start with Phase 1A (Auth)** - Foundation for all other features
2. **Run seed script** - Get test data in database
3. **Implement test flow** - Core user experience
4. **Add progress tracking** - User retention feature
5. **Enhance admin tools** - Content management
