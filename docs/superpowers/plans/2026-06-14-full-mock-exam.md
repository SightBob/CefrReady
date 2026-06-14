# Full Mock Exam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/tests/full` — a 45-question real-time adaptive full mock exam that mixes Focus on Form, Focus on Meaning, Listening, and one Form & Meaning item, normalises the score to a 1–120 CEFR scale, and persists progress to the database.

**Architecture:** Add columns to `test_attempts` for adaptive state, implement a pure TypeScript adaptive engine in `src/lib/full-test/`, expose five API routes under `/api/tests/full/*`, and build three Next.js pages (`/tests/full`, `/tests/full/exam`, `/tests/full/results`) that reuse existing question card components.

**Tech Stack:** Next.js 14 App Router, TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS, Zod, Vitest (new dev dependency for algorithm tests).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/db/schema.ts` | Add `adaptive_path`, `status`, `current_level`, `time_remaining_seconds`, `last_activity_at` to `test_attempts`. |
| `drizzle/0009_full_mock_exam.sql` | Auto-generated migration for the new columns. |
| `src/lib/full-test/constants.ts` | CEFR ordering, weights, part distribution, score ranges. |
| `src/lib/full-test/algorithm.ts` | `getNextLevel()`, `selectQuestion()`, scoring functions. |
| `src/lib/full-test/submit-attempt.ts` | Shared helper to finalise and score an attempt. |
| `src/lib/full-test/algorithm.test.ts` | Vitest unit tests for the engine. |
| `src/app/api/tests/full/start/route.ts` | Create attempt, pick first question. |
| `src/app/api/tests/full/next/route.ts` | Record answer, return next adaptive question. |
| `src/app/api/tests/full/submit/route.ts` | Final scoring, persist results. |
| `src/app/api/tests/full/cancel/route.ts` | Mark attempt as `cancelled`. |
| `src/app/api/tests/full/resume/route.ts` | Resume or auto-submit expired attempt. |
| `src/app/tests/page.tsx` | Add `FullTestCard` at the top. |
| `src/app/tests/full/page.tsx` | Intro page. |
| `src/app/tests/full/exam/page.tsx` | Active exam shell. |
| `src/app/tests/full/results/page.tsx` | Results + per-part breakdown. |
| `src/components/FullTestCard.tsx` | Prominent card linking to `/tests/full`. |
| `src/components/FullTestIntro.tsx` | Rules, CEFR table, Start button. |
| `src/components/FullTestExamClient.tsx` | Timer, question renderer, navigation. |
| `src/components/FullTestResults.tsx` | Score display, breakdown, adaptive path. |

---

## Phase 1: Schema + Algorithm

### Task 1.1: Add columns to `test_attempts`

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add columns to `testAttempts` table**

```typescript
export const testAttempts = pgTable('test_attempts', {
  // ... existing columns ...
  score: varchar('score', { length: 10 }),
  totalQuestions: integer('total_questions'),
  correctAnswers: integer('correct_answers'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  // NEW:
  status: varchar('status', { length: 20 }).default('in_progress').notNull(),
  currentLevel: varchar('current_level', { length: 10 }),
  timeRemainingSeconds: integer('time_remaining_seconds'),
  lastActivityAt: timestamp('last_activity_at'),
  adaptivePath: jsonb('adaptive_path').$type<Array<{
    questionId: number;
    testTypeId: string;
    cefrLevel: string;
    difficulty: string | null;
    wasCorrect: boolean;
    selectedAnswer: string;
    orderIndex: number;
  }>>().default([]),
  // ... createdAt/updatedAt ...
});
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add adaptive state columns to test_attempts"
```

---

### Task 1.2: Generate migration

**Files:**
- Create: `drizzle/0009_*.sql` (auto-generated)

- [ ] **Step 1: Generate migration**

```bash
npm run db:generate
```

Expected: `drizzle/0009_*.sql` and `drizzle/meta/0009_snapshot.json` are created.

- [ ] **Step 2: Inspect generated SQL**

```bash
Get-ChildItem drizzle/*.sql | Sort-Object Name | Select-Object -Last 1
```

Verify it contains `ALTER TABLE "test_attempts" ADD COLUMN` for the five new columns.

- [ ] **Step 3: Commit**

```bash
git add drizzle/
git commit -m "chore(db): generate migration for full mock exam columns"
```

---

### Task 1.3: Create full-test constants

**Files:**
- Create: `src/lib/full-test/constants.ts`

- [ ] **Step 1: Write constants file**

```typescript
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_WEIGHTS: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export const CEFR_SCORE_RANGES: Record<CefrLevel, { min: number; max: number }> = {
  A1: { min: 1, max: 20 },
  A2: { min: 21, max: 40 },
  B1: { min: 41, max: 60 },
  B2: { min: 61, max: 80 },
  C1: { min: 81, max: 100 },
  C2: { min: 101, max: 120 },
};

export const FULL_TEST_TOTAL_SECONDS = 60 * 60; // 60 minutes

export const FULL_TEST_PART_DISTRIBUTION = [
  'form-meaning',
  ...Array(15).fill('focus-form'),
  ...Array(14).fill('focus-meaning'),
  ...Array(15).fill('listening'),
] as const;

export const FULL_TEST_TOTAL_QUESTIONS = FULL_TEST_PART_DISTRIBUTION.length; // 45

export function cefrIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function clampLevel(index: number): CefrLevel {
  return CEFR_LEVELS[Math.max(0, Math.min(CEFR_LEVELS.length - 1, index))];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/full-test/constants.ts
git commit -m "feat(full-test): add cefr constants and part distribution"
```

---

### Task 1.4: Install Vitest and add test script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Add test script**

Edit `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Keep existing `"test": "npm run build"` as fallback if preferred, but add a new script:

```json
"test:unit": "vitest run"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Verify install**

```bash
npx vitest --version
```

Expected: version printed, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts
git commit -m "chore(test): add vitest for unit testing"
```

---

### Task 1.5: Implement adaptive level calculation

**Files:**
- Create: `src/lib/full-test/algorithm.ts`
- Create: `src/lib/full-test/algorithm.test.ts`

- [ ] **Step 1: Write `getNextLevel()`**

```typescript
import { type CefrLevel, CEFR_LEVELS, cefrIndex, clampLevel } from './constants';

export function getNextLevel(
  currentLevel: CefrLevel,
  answerHistory: boolean[]
): CefrLevel {
  const currentIndex = cefrIndex(currentLevel);

  // Question 1: use single result
  if (answerHistory.length === 1) {
    return answerHistory[0] ? clampLevel(currentIndex + 1) : clampLevel(currentIndex - 1);
  }

  // Question 2: use last 2
  if (answerHistory.length === 2) {
    const avg = answerHistory.reduce((a, b) => a + (b ? 1 : 0), 0) / answerHistory.length;
    if (avg >= 0.7) return clampLevel(currentIndex + 1);
    if (avg <= 0.3) return clampLevel(currentIndex - 1);
    return currentLevel;
  }

  // Question 3+: weighted average of last 3-5
  const window = answerHistory.slice(-5);
  const avg = window.reduce((a, b) => a + (b ? 1 : 0), 0) / window.length;
  if (avg >= 0.7) return clampLevel(currentIndex + 1);
  if (avg <= 0.3) return clampLevel(currentIndex - 1);
  return currentLevel;
}
```

- [ ] **Step 2: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { getNextLevel } from './algorithm';

describe('getNextLevel', () => {
  it('moves up after first correct answer', () => {
    expect(getNextLevel('B1', [true])).toBe('B2');
  });

  it('moves down after first incorrect answer', () => {
    expect(getNextLevel('B1', [false])).toBe('A2');
  });

  it('clamps at A1', () => {
    expect(getNextLevel('A1', [false])).toBe('A1');
  });

  it('clamps at C2', () => {
    expect(getNextLevel('C2', [true])).toBe('C2');
  });

  it('uses last 2 answers for question 2', () => {
    expect(getNextLevel('B1', [true, true])).toBe('B2');
    expect(getNextLevel('B1', [true, false])).toBe('B1');
    expect(getNextLevel('B1', [false, false])).toBe('A2');
  });

  it('uses weighted window of last 5 answers', () => {
    expect(getNextLevel('B1', [false, false, true, true, true, true])).toBe('B2');
    expect(getNextLevel('B1', [true, true, true, false, false, false])).toBe('A2');
  });
});
```

- [ ] **Step 3: Run test**

```bash
npx vitest run src/lib/full-test/algorithm.test.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/full-test/algorithm.ts src/lib/full-test/algorithm.test.ts
git commit -m "feat(full-test): implement adaptive level calculation with tests"
```

---

### Task 1.6: Implement question selection

**Files:**
- Modify: `src/lib/full-test/algorithm.ts`
- Modify: `src/lib/full-test/algorithm.test.ts`

- [ ] **Step 1: Add `selectQuestion()`**

```typescript
import type { DbQuestion } from '@/db/schema';

interface QuestionPool {
  questions: DbQuestion[];
  seenQuestionIds: Set<number>;
  targetLevel: CefrLevel;
  requiredTestTypeId: string;
}

export function selectQuestion({
  questions,
  seenQuestionIds,
  targetLevel,
  requiredTestTypeId,
}: QuestionPool): DbQuestion | null {
  const levelIndex = cefrIndex(targetLevel);

  const findUnused = (level: CefrLevel) =>
    questions.find(
      (q) =>
        q.testTypeId === requiredTestTypeId &&
        q.cefrLevel === level &&
        !seenQuestionIds.has(q.id)
    );

  // 1. Try target level
  let candidate = findUnused(targetLevel);
  if (candidate) return candidate;

  // 2. Fallback to nearest levels (alternate up/down)
  for (let offset = 1; offset < CEFR_LEVELS.length; offset++) {
    const higher = clampLevel(levelIndex + offset);
    candidate = findUnused(higher);
    if (candidate) return candidate;

    const lower = clampLevel(levelIndex - offset);
    candidate = findUnused(lower);
    if (candidate) return candidate;
  }

  // 3. Reuse any previously seen question for this part type
  candidate = questions.find(
    (q) => q.testTypeId === requiredTestTypeId
  );
  if (candidate) return candidate;

  // 4. Nothing available
  return null;
}
```

- [ ] **Step 2: Add tests**

```typescript
const makeQuestion = (id: number, testTypeId: string, cefrLevel: CefrLevel): DbQuestion =>
  ({
    id,
    testTypeId,
    cefrLevel,
    questionText: '',
    // satisfy minimal DbQuestion shape
  } as unknown as DbQuestion);

describe('selectQuestion', () => {
  it('returns target level when available', () => {
    const q = makeQuestion(1, 'focus-form', 'B1');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.id).toBe(1);
  });

  it('falls back to nearest level when target exhausted', () => {
    const q = makeQuestion(2, 'focus-form', 'B2');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result?.id).toBe(2);
  });

  it('respects required test type', () => {
    const q = makeQuestion(3, 'listening', 'B1');
    const result = selectQuestion({
      questions: [q],
      seenQuestionIds: new Set(),
      targetLevel: 'B1',
      requiredTestTypeId: 'focus-form',
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/lib/full-test/algorithm.test.ts
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(full-test): add adaptive question selection with tests"
```

---

### Task 1.7: Implement scoring and normalization

**Files:**
- Modify: `src/lib/full-test/algorithm.ts`
- Modify: `src/lib/full-test/algorithm.test.ts`

- [ ] **Step 1: Add scoring functions**

```typescript
import { CEFR_WEIGHTS, CEFR_SCORE_RANGES } from './constants';

export function calculateRawScore(
  path: Array<{ cefrLevel: CefrLevel; wasCorrect: boolean }>
): number {
  return path.reduce((sum, item) => {
    if (!item.wasCorrect) return sum;
    return sum + CEFR_WEIGHTS[item.cefrLevel];
  }, 0);
}

export function calculateMaxPossibleScore(
  path: Array<{ cefrLevel: CefrLevel }>
): number {
  return path.reduce((sum, item) => sum + CEFR_WEIGHTS[item.cefrLevel], 0);
}

export function normalizeScore(
  rawScore: number,
  maxPossibleScore: number
): number {
  if (maxPossibleScore <= 0) return 0;
  return Math.round((rawScore / maxPossibleScore) * 120);
}

export function normalizedScoreToCefr(score: number): CefrLevel {
  const entries = Object.entries(CEFR_SCORE_RANGES) as [CefrLevel, { min: number; max: number }][];
  for (const [level, range] of entries) {
    if (score >= range.min && score <= range.max) return level;
  }
  if (score < 1) return 'A1';
  return 'C2';
}
```

- [ ] **Step 2: Add tests**

```typescript
describe('scoring', () => {
  it('calculates raw and normalized score', () => {
    const path = [
      { cefrLevel: 'B1' as CefrLevel, wasCorrect: true }, // 3
      { cefrLevel: 'B2' as CefrLevel, wasCorrect: true }, // 4
      { cefrLevel: 'A2' as CefrLevel, wasCorrect: false }, // 0
    ];
    const raw = calculateRawScore(path);
    const max = calculateMaxPossibleScore(path);
    expect(raw).toBe(7);
    expect(max).toBe(9);
    expect(normalizeScore(raw, max)).toBe(93);
  });

  it('maps normalized score to CEFR', () => {
    expect(normalizedScoreToCefr(93)).toBe('C1');
    expect(normalizedScoreToCefr(45)).toBe('B1');
    expect(normalizedScoreToCefr(0)).toBe('A1');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/lib/full-test/algorithm.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(full-test): add scoring and normalization with tests"
```

---

## Phase 2: API Endpoints

### Task 2.1: Create `POST /api/tests/full/start`

**Files:**
- Create: `src/app/api/tests/full/start/route.ts`

- [ ] **Step 1: Write route**

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, userProgress, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import {
  CEFR_LEVELS,
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
} from '@/lib/full-test/constants';
import { selectQuestion } from '@/lib/full-test/algorithm';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Check for existing in-progress attempt
  const existing = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, user.id), eq(testAttempts.status, 'in_progress')))
    .orderBy(sql`${testAttempts.startedAt} desc`)
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ success: true, data: { attemptId: existing[0].id, resume: true } });
  }

  // Determine starting level
  const progress = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, user.id));

  const overallScore = progress[0]?.averageScore
    ? parseFloat(progress[0].averageScore)
    : 0;
  const startLevel = overallScore > 0
    ? estimateCefrLevel(overallScore)
    : 'B1';

  // Create attempt
  const [attempt] = await db
    .insert(testAttempts)
    .values({
      userId: user.id,
      testTypeId: 'full-test',
      status: 'in_progress',
      currentLevel: startLevel,
      timeRemainingSeconds: FULL_TEST_TOTAL_SECONDS,
      lastActivityAt: new Date(),
      adaptivePath: [],
    })
    .returning();

  // Select first question (slot 0 = form-meaning)
  const firstPart = FULL_TEST_PART_DISTRIBUTION[0];
  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, firstPart), eq(questions.active, 'true')));

  const firstQuestion = selectQuestion({
    questions: pool,
    seenQuestionIds: new Set(),
    targetLevel: startLevel as CefrLevel,
    requiredTestTypeId: firstPart,
  });

  if (!firstQuestion) {
    return NextResponse.json({ success: false, error: 'No questions available' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      question: firstQuestion,
      questionIndex: 0,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
      timeRemaining: FULL_TEST_TOTAL_SECONDS,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tests/full/start/route.ts
git commit -m "feat(api): add full test start endpoint"
```

---

### Task 2.2: Create `POST /api/tests/full/next`

**Files:**
- Create: `src/app/api/tests/full/next/route.ts`

- [ ] **Step 1: Write route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_QUESTIONS,
  type CefrLevel,
} from '@/lib/full-test/constants';
import { getNextLevel, selectQuestion } from '@/lib/full-test/algorithm';

const bodySchema = z.object({
  attemptId: z.number(),
  questionId: z.number(),
  selectedAnswer: z.string(),
  timeRemaining: z.number(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { attemptId, questionId, selectedAnswer, timeRemaining } = parsed.data;

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, user.id)));

  if (!attempt || attempt.status !== 'in_progress') {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  // Validate answer against DB
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId));

  if (!question) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
  }

  // Determine correctness
  let isCorrect = false;
  if (question.testTypeId === 'form-meaning' && question.article) {
    const art = question.article as { blanks: Array<{ id: number; correctAnswer: string }> };
    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(selectedAnswer); } catch {}
    isCorrect = art.blanks.every(
      (b) => (parsed[String(b.id)] ?? '').toLowerCase().trim() === b.correctAnswer.toLowerCase().trim()
    );
  } else {
    isCorrect = selectedAnswer.toLowerCase().trim() === (question.correctAnswer ?? '').toLowerCase().trim();
  }

  const currentPath = (attempt.adaptivePath ?? []) as Array<{
    questionId: number;
    testTypeId: string;
    cefrLevel: CefrLevel;
    difficulty: string | null;
    wasCorrect: boolean;
    orderIndex: number;
  }>;

  const orderIndex = currentPath.length;
  const newPath = [
    ...currentPath,
    {
      questionId,
      testTypeId: question.testTypeId,
      cefrLevel: question.cefrLevel as CefrLevel,
      difficulty: question.difficulty,
      wasCorrect: isCorrect,
      selectedAnswer,
      orderIndex,
    },
  ];

  const answerHistory = newPath.map((p) => p.wasCorrect);
  const nextLevel = getNextLevel((attempt.currentLevel as CefrLevel) ?? 'B1', answerHistory);

  // Determine next part
  const nextIndex = newPath.length;
  if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
    // End of exam — return flag to trigger submit
    await db
      .update(testAttempts)
      .set({
        adaptivePath: newPath,
        timeRemainingSeconds: timeRemaining,
        lastActivityAt: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));

    return NextResponse.json({ success: true, data: { finished: true } });
  }

  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];

  // Select next question
  const seenIds = new Set(newPath.map((p) => p.questionId));
  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

  const nextQuestion = selectQuestion({
    questions: pool,
    seenQuestionIds: seenIds,
    targetLevel: nextLevel,
    requiredTestTypeId: nextPart,
  });

  if (!nextQuestion) {
    // Pool exhausted — finish early
    await db
      .update(testAttempts)
      .set({
        adaptivePath: newPath,
        timeRemainingSeconds: timeRemaining,
        lastActivityAt: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));
    return NextResponse.json({ success: true, data: { finished: true, reason: 'pool_exhausted' } });
  }

  await db
    .update(testAttempts)
    .set({
      adaptivePath: newPath,
      currentLevel: nextLevel,
      timeRemainingSeconds: timeRemaining,
      lastActivityAt: new Date(),
    })
    .where(eq(testAttempts.id, attemptId));

  return NextResponse.json({
    success: true,
    data: {
      question: nextQuestion,
      questionIndex: nextIndex,
      finished: false,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tests/full/next/route.ts
git commit -m "feat(api): add full test next endpoint"
```

---

### Task 2.3: Create shared submit helper and `POST /api/tests/full/submit`

**Files:**
- Create: `src/lib/full-test/submit-attempt.ts`
- Create: `src/app/api/tests/full/submit/route.ts`

- [ ] **Step 1: Write `submit-attempt.ts` helper**

```typescript
import { db } from '@/db';
import { testAttempts, userAnswers, userProgress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { type CefrLevel } from './constants';
import {
  calculateRawScore,
  calculateMaxPossibleScore,
  normalizeScore,
  normalizedScoreToCefr,
} from './algorithm';

export async function submitAttempt(attemptId: number, userId: string) {
  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)));

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status === 'completed') return buildResult(attempt);

  const path = (attempt.adaptivePath ?? []) as Array<{
    questionId: number;
    testTypeId: string;
    cefrLevel: CefrLevel;
    wasCorrect: boolean;
    selectedAnswer: string;
  }>;

  const rawScore = calculateRawScore(path);
  const maxPossible = calculateMaxPossibleScore(path);
  const normalized = normalizeScore(rawScore, maxPossible);
  const cefrLevel = normalizedScoreToCefr(normalized);
  const correctCount = path.filter((p) => p.wasCorrect).length;
  const now = new Date();

  await db
    .update(testAttempts)
    .set({
      status: 'completed',
      score: normalized.toString(),
      totalQuestions: path.length,
      correctAnswers: correctCount,
      completedAt: now,
    })
    .where(eq(testAttempts.id, attemptId));

  if (path.length > 0) {
    await db.insert(userAnswers).values(
      path.map((p) => ({
        attemptId,
        questionId: p.questionId,
        selectedAnswer: p.selectedAnswer,
        isCorrect: p.wasCorrect,
        createdAt: now,
      }))
    );
  }

  await updateUserProgress(userId, 'full-test', normalized);

  const [updated] = await db
    .select()
    .from(testAttempts)
    .where(eq(testAttempts.id, attemptId));

  return buildResult(updated, normalized, cefrLevel, correctCount, path.length);
}

function buildResult(
  attempt: any,
  normalized?: number,
  cefrLevel?: CefrLevel,
  correctCount?: number,
  totalQuestions?: number
) {
  return {
    attemptId: attempt.id,
    score: normalized ?? parseFloat(attempt.score ?? '0'),
    cefrLevel: cefrLevel ?? null,
    correctAnswers: correctCount ?? attempt.correctAnswers,
    totalQuestions: totalQuestions ?? attempt.totalQuestions,
    adaptivePath: attempt.adaptivePath ?? [],
  };
}

async function updateUserProgress(userId: string, testTypeId: string, score: number) {
  const existing = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.testTypeId, testTypeId)));

  if (existing.length > 0) {
    const p = existing[0];
    const taken = (p.testsTaken ?? 0) + 1;
    const prevAvg = parseFloat((p.averageScore ?? '0').toString()) || 0;
    const newAvg = (prevAvg * (taken - 1) + score) / taken;
    await db
      .update(userProgress)
      .set({ averageScore: newAvg.toString(), testsTaken: taken, lastAttemptAt: new Date() })
      .where(eq(userProgress.id, p.id));
  } else {
    await db.insert(userProgress).values({
      userId,
      testTypeId,
      averageScore: score.toString(),
      testsTaken: 1,
      lastAttemptAt: new Date(),
    });
  }
}
```

- [ ] **Step 2: Write submit route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-utils';
import { submitAttempt } from '@/lib/full-test/submit-attempt';

const bodySchema = z.object({ attemptId: z.number() });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await submitAttempt(parsed.data.attemptId, user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 404 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/full-test/submit-attempt.ts src/app/api/tests/full/submit/route.ts
git commit -m "feat(api): add shared submit helper and full test submit endpoint"
```

---

### Task 2.4: Create `POST /api/tests/full/cancel`

**Files:**
- Create: `src/app/api/tests/full/cancel/route.ts`

- [ ] **Step 1: Write route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

const bodySchema = z.object({ attemptId: z.number() });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await db
    .update(testAttempts)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(testAttempts.id, parsed.data.attemptId),
        eq(testAttempts.userId, user.id),
        eq(testAttempts.status, 'in_progress')
      )
    );

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tests/full/cancel/route.ts
git commit -m "feat(api): add full test cancel endpoint"
```

---

### Task 2.5: Create `GET /api/tests/full/resume`

**Files:**
- Create: `src/app/api/tests/full/resume/route.ts`

- [ ] **Step 1: Write route**

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { FULL_TEST_PART_DISTRIBUTION, type CefrLevel } from '@/lib/full-test/constants';
import { selectQuestion } from '@/lib/full-test/algorithm';
import { submitAttempt } from '@/lib/full-test/submit-attempt';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, user.id), eq(testAttempts.status, 'in_progress')))
    .orderBy(sql`${testAttempts.startedAt} desc`)
    .limit(1);

  if (!attempt) {
    return NextResponse.json({ success: true, data: null });
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(attempt.lastActivityAt ?? attempt.startedAt).getTime()) / 1000
  );
  const realRemaining = (attempt.timeRemainingSeconds ?? 0) - elapsedSeconds;

  if (realRemaining <= 0) {
    // Auto-submit expired attempt
    const result = await submitAttempt(attempt.id, user.id);
    return NextResponse.json({ success: true, data: { expired: true, result } });
  }

  const path = (attempt.adaptivePath ?? []) as Array<{ questionId: number; testTypeId: string }>;
  const nextIndex = path.length;
  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];

  const seenIds = new Set(path.map((p) => p.questionId));
  const pool = await db
    .select()
    .from(questions)
    .where(eq(questions.testTypeId, nextPart));

  const nextQuestion = selectQuestion({
    questions: pool,
    seenQuestionIds: seenIds,
    targetLevel: (attempt.currentLevel as CefrLevel) ?? 'B1',
    requiredTestTypeId: nextPart,
  });

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      question: nextQuestion,
      questionIndex: nextIndex,
      timeRemaining: realRemaining,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tests/full/resume/route.ts
git commit -m "feat(api): add full test resume endpoint"
```

---

### Task 2.6: Create `GET /api/tests/full/result/[attemptId]`

**Files:**
- Create: `src/app/api/tests/full/result/[attemptId]/route.ts`

- [ ] **Step 1: Write route**

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const attemptId = parseInt(params.attemptId);
  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, user.id)));

  if (!attempt) {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      score: parseFloat(attempt.score ?? '0'),
      cefrLevel: attempt.score ? normalizedScoreToCefr(parseFloat(attempt.score)) : null,
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      adaptivePath: attempt.adaptivePath ?? [],
    },
  });
}
```

Note: import `normalizedScoreToCefr` from `@/lib/full-test/algorithm`.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tests/full/result/[attemptId]/route.ts
git commit -m "feat(api): add full test result endpoint"
```

---

### Task 2.7: Manual API smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login and create attempt**

Use browser or curl:

```bash
curl -X POST http://localhost:3000/api/tests/full/start -H "Content-Type: application/json"
```

Expected: JSON with `attemptId` and first question.

- [ ] **Step 3: Submit an answer**

```bash
curl -X POST http://localhost:3000/api/tests/full/next \
  -H "Content-Type: application/json" \
  -d '{"attemptId":1,"questionId":123,"selectedAnswer":"A","timeRemaining":3500}'
```

Expected: next question returned.

- [ ] **Step 4: Stop dev server**

---

## Phase 3: Frontend Pages

### Task 3.1: Add Full Test card to `/tests`

**Files:**
- Modify: `src/app/tests/page.tsx`
- Create: `src/components/FullTestCard.tsx`

- [ ] **Step 1: Create `FullTestCard.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Trophy, Clock, ListChecks } from 'lucide-react';

export default function FullTestCard() {
  return (
    <Link
      href="/tests/full"
      className="group block w-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 mb-8"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">Full Mock Exam</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">สอบจำลองเต็มรูปแบบ</h2>
          <p className="text-white/90 text-sm max-w-xl">
            45 ข้อรวมทุกพาร์ท พร้อมระบบ Adaptive ปรับระดับยากง่ายตามคำตอบของคุณ
          </p>
        </div>
        <div className="hidden sm:flex flex-col gap-2 text-sm text-white/90">
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 60 นาที</div>
          <div className="flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> 45 ข้อ</div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Modify `src/app/tests/page.tsx`**

Insert `<FullTestCard />` above the section grid:

```tsx
<FullTestCard />

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {sections.map((section) => (
    <SectionCard key={section.id} section={section} />
  ))}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/FullTestCard.tsx src/app/tests/page.tsx
git commit -m "feat(tests): add full mock exam card to tests landing"
```

---

### Task 3.2: Create `/tests/full` intro page

**Files:**
- Create: `src/app/tests/full/page.tsx`

- [ ] **Step 1: Write intro page**

```tsx
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, Play, Clock, ListChecks, Brain } from 'lucide-react';

export const metadata: Metadata = {
  title: 'สอบจำลองเต็มรูปแบบ | CEFR Ready',
  description: 'ข้อสอบ CEFR 45 ข้อ ครบทุกพาร์ท ระบบ Adaptive ปรับระดับตามคำตอบ',
};

const CEFR_TABLE = [
  { level: 'C2', range: '101 – 120', desc: 'เชี่ยวชาญสูงสุด' },
  { level: 'C1', range: '81 – 100', desc: 'ขั้นสูง' },
  { level: 'B2', range: '61 – 80', desc: 'ขั้นกลางสูง' },
  { level: 'B1', range: '41 – 60', desc: 'ขั้นกลาง' },
  { level: 'A2', range: '21 – 40', desc: 'ขั้นต้น' },
  { level: 'A1', range: '1 – 20', desc: 'ขั้นพื้นฐาน' },
];

export default async function FullTestIntroPage() {
  const session = await auth();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-5 h-5" /> กลับไปหน้าข้อสอบ
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">สอบจำลองเต็มรูปแบบ</h1>
      <p className="text-slate-600 mb-8">
        ทดสอบตัวเองด้วยข้อสอบ 45 ข้อที่รวมทุกพาร์ท ระบบจะปรับระดับความยากตามคำตอบของคุณแบบเรียลไทม์
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <ListChecks className="w-6 h-6 text-primary-600" />
          <div><p className="text-sm text-slate-500">จำนวนข้อ</p><p className="font-bold">45 ข้อ</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <Clock className="w-6 h-6 text-primary-600" />
          <div><p className="text-sm text-slate-500">เวลา</p><p className="font-bold">60 นาที</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary-600" />
          <div><p className="text-sm text-slate-500">ระบบ</p><p className="font-bold">Adaptive</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr><th className="text-left p-3">ระดับ CEFR</th><th className="text-left p-3">คะแนน</th><th className="text-left p-3">คำอธิบาย</th></tr>
          </thead>
          <tbody>
            {CEFR_TABLE.map((row) => (
              <tr key={row.level} className="border-t border-slate-100">
                <td className="p-3 font-bold">{row.level}</td>
                <td className="p-3">{row.range}</td>
                <td className="p-3 text-slate-600">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
        <p className="font-semibold mb-1">กติกา</p>
        <ul className="list-disc list-inside space-y-1">
          <li>ไม่สามารถย้อนกลับไปแก้ข้อก่อนหน้าได้</li>
          <li>หากไม่ตอบและกดข้อถัดไป ข้อนั้นจะถือว่าผิด</li>
          <li>เมื่อครบ 60 นาทีระบบจะส่งคำตอบโดยอัตโนมัติ</li>
          <li>สามารถกดยกเลิกการสอบได้ตลอดเวลา</li>
        </ul>
      </div>

      {session?.user ? (
        <Link
          href="/tests/full/exam"
          className="btn-primary inline-flex items-center gap-2 text-lg py-3 px-8"
        >
          <Play className="w-5 h-5" /> เริ่มสอบ
        </Link>
      ) : (
        <Link
          href="/api/auth/signin?callbackUrl=/tests/full"
          className="btn-primary inline-flex items-center gap-2 text-lg py-3 px-8"
        >
          เข้าสู่ระบบเพื่อเริ่มสอบ
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/tests/full/page.tsx
git commit -m "feat(full-test): add intro page"
```

---

### Task 3.3: Create `/tests/full/exam` page

**Files:**
- Create: `src/app/tests/full/exam/page.tsx`

- [ ] **Step 1: Write exam shell**

This is a large client component page. Start with the skeleton:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';

const TOTAL_QUESTIONS = 45;
const TOTAL_SECONDS = 60 * 60;

interface Question {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  audioUrl?: string | null;
  transcript?: string | null;
  conversation?: Array<{ speaker: string; text: string }>;
  article?: { title: string; text: string; blanks: Array<{ id: number; correctAnswer: string; hint?: string }> };
  cefrLevel: string;
}

export default function FullTestExamPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/tests/full');
      return;
    }
    if (status === 'authenticated') {
      startOrResume();
    }
  }, [status, router]);

  const startOrResume = async () => {
    try {
      const resumeRes = await fetch('/api/tests/full/resume');
      const resumeData = await resumeRes.json();

      if (resumeData.success && resumeData.data && !resumeData.data.expired) {
        loadState(resumeData.data);
        setLoading(false);
        return;
      }

      if (resumeData.success && resumeData.data?.expired) {
        router.push('/tests/full/results');
        return;
      }

      const startRes = await fetch('/api/tests/full/start', { method: 'POST' });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);

      if (startData.data.resume) {
        const resumeRes2 = await fetch('/api/tests/full/resume');
        const resumeData2 = await resumeRes2.json();
        loadState(resumeData2.data);
      } else {
        loadState(startData.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถเริ่มข้อสอบได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadState = (data: any) => {
    setAttemptId(data.attemptId);
    setQuestion(data.question);
    setQuestionIndex(data.questionIndex);
    setTimeRemaining(data.timeRemaining ?? TOTAL_SECONDS);
    setSelectedAnswer(null);
  };

  // Timer effect
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  const handleTimeUp = async () => {
    if (!attemptId) return;
    setFinished(true);
    await fetch('/api/tests/full/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId }),
    });
    router.push(`/tests/full/results?attemptId=${attemptId}`);
  };

  const handleNext = async () => {
    if (!attemptId || !question || submitting) return;

    if (!selectedAnswer) {
      const confirmed = window.confirm('คุณยังไม่ได้เลือกคำตอบ ต้องการข้ามข้อนี้หรือไม่?');
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tests/full/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId: question.id,
          selectedAnswer: selectedAnswer ?? '',
          timeRemaining,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.data.finished) {
        router.push(`/tests/full/results?attemptId=${attemptId}`);
        return;
      }

      setQuestion(data.data.question);
      setQuestionIndex(data.data.questionIndex);
      setSelectedAnswer(null);
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!attemptId) return;
    const confirmed = window.confirm('ต้องการยกเลิกการสอบ? คำตอบจะไม่ถูกบันทึก');
    if (!confirmed) return;
    await fetch('/api/tests/full/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId }),
    });
    router.push('/tests');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  if (!question) {
    return <div className="min-h-screen flex items-center justify-center">ไม่พบข้อสอบ</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
          style={{ width: `${((questionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}
        />
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={handleCancel} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">ข้อ {questionIndex + 1}/{TOTAL_QUESTIONS}</span>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-bold ${timeRemaining <= 120 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <div className="text-xs font-medium text-slate-500 uppercase mb-2">
            {question.testTypeId.replace(/-/g, ' ')}
          </div>
          <p className="text-lg font-medium text-slate-900 mb-6">{question.questionText}</p>

          {/* Render options for focus-form / focus-meaning / listening */}
          {question.testTypeId !== 'form-meaning' && (
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((key) => {
                const value = question[`option${key}` as keyof Question] as string | null;
                if (!value) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedAnswer(key)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedAnswer === key
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold mr-2">{key}.</span>
                    {value}
                  </button>
                );
              })}
            </div>
          )}

          {/* Question-type-specific rendering will be added in the next task */}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={submitting}
            className="btn-primary py-3 px-8 disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : 'ข้อต่อไป'}
          </button>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/tests/full/exam/page.tsx
git commit -m "feat(full-test): add exam page shell"
```

---

### Task 3.4: Integrate question components into exam page

**Files:**
- Modify: `src/app/tests/full/exam/page.tsx`

- [ ] **Step 1: Add dynamic imports for question cards**

```tsx
import dynamic from 'next/dynamic';

const ListeningAudioPlayer = dynamic(() => import('@/components/ListeningAudioPlayer'), { ssr: false });
const FocusMeaningConversationCard = dynamic(() => import('@/components/FocusMeaningConversationCard'), { ssr: false });
const FormMeaningQuiz = dynamic(() => import('@/components/FormMeaningQuiz'), { ssr: false });
```

- [ ] **Step 2: Replace the renderer placeholder block with component rendering**

```tsx
{question.testTypeId === 'listening' && (
  <ListeningAudioPlayer
    audioUrl={question.audioUrl ?? undefined}
    transcript={question.transcript ?? question.questionText}
    questionText={question.questionText}
    options={[
      { key: 'A', value: question.optionA ?? '' },
      { key: 'B', value: question.optionB ?? '' },
      { key: 'C', value: question.optionC ?? '' },
      { key: 'D', value: question.optionD ?? '' },
    ]}
    selectedAnswer={selectedAnswer}
    onAnswerSelect={setSelectedAnswer}
  />
)}

{question.testTypeId === 'focus-meaning' && (
  <FocusMeaningConversationCard
    conversation={question.conversation ?? []}
    question={question.questionText}
    options={[
      question.optionA ?? '',
      question.optionB ?? '',
      question.optionC ?? '',
      question.optionD ?? '',
    ]}
    selectedAnswer={selectedAnswer ? ['A','B','C','D'].indexOf(selectedAnswer) : null}
    onAnswerSelect={(idx) => setSelectedAnswer(['A','B','C','D'][idx])}
  />
)}

{question.testTypeId === 'form-meaning' && question.article && (
  <FormMeaningQuiz
    article={question.article}
    onChange={(answers) => setSelectedAnswer(JSON.stringify(answers))}
  />
)}
```

**Note:** `FormMeaningQuiz` does not exist as a standalone component. Either:
- Extract the inline `FormMeaningQuiz` from `src/app/tests/[sectionId]/[setId]/page.tsx` into `src/components/FormMeaningQuiz.tsx`, or
- Inline the form-meaning rendering directly in the exam page.

For reuse, prefer creating `src/components/FormMeaningQuiz.tsx` with props:
```typescript
interface FormMeaningQuizProps {
  article: { title: string; text: string; blanks: Array<{ id: number; correctAnswer: string; hint?: string }> };
  onChange: (answers: Record<number, string>) => void;
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(full-test): integrate question components in exam page"
```

---

### Task 3.5: Create `/tests/full/results` page

**Files:**
- Create: `src/app/tests/full/results/page.tsx`

- [ ] **Step 1: Write results page**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CEFR_COLORS, CEFR_DESCRIPTIONS } from '@/lib/cefr-estimator';
import type { CefrLevel } from '@/lib/cefr-estimator';

interface ResultData {
  attemptId: number;
  score: number;
  cefrLevel: CefrLevel;
  correctAnswers: number;
  totalQuestions: number;
  adaptivePath: Array<{ testTypeId: string; cefrLevel: string; wasCorrect: boolean }>;
}

export default function FullTestResultsPage() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }
    fetch(`/api/tests/full/result/${attemptId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setResult(data.data);
        }
        setLoading(false);
      });
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">ไม่พบผลการสอบ</p>
        <Link href="/tests/full" className="text-primary-600 hover:underline mt-4 inline-block">
          กลับไปหน้าสอบจำลอง
        </Link>
      </div>
    );
  }

  const perPart = result.adaptivePath.reduce((acc, item) => {
    if (!acc[item.testTypeId]) acc[item.testTypeId] = { total: 0, correct: 0 };
    acc[item.testTypeId].total++;
    if (item.wasCorrect) acc[item.testTypeId].correct++;
    return acc;
  }, {} as Record<string, { total: number; correct: number }>);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-5 h-5" /> กลับไปหน้าข้อสอบ
      </Link>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ผลการสอบจำลอง</h1>
        <p className="text-slate-600 mb-6">คะแนนรวมของคุณ</p>

        <div className="text-5xl font-bold text-slate-900 mb-2">{result.score}</div>
        <div className="text-slate-500 mb-6">จาก 120 คะแนน</div>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${CEFR_COLORS[result.cefrLevel]}`}>
          <span className="text-2xl font-bold">{result.cefrLevel}</span>
          <span className="text-sm">{CEFR_DESCRIPTIONS[result.cefrLevel]}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">สัดส่วนตามพาร์ท</h2>
        <div className="space-y-3">
          {Object.entries(perPart).map(([testTypeId, stats]) => (
            <div key={testTypeId} className="flex items-center justify-between">
              <span className="text-slate-700 capitalize">{testTypeId.replace(/-/g, ' ')}</span>
              <span className="font-medium">{stats.correct}/{stats.total} ข้อ</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Link href="/tests/full" className="btn-primary">
          สอบอีกครั้ง
        </Link>
        <Link href="/tests" className="btn-secondary">
          กลับหน้าข้อสอบ
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/tests/full/results/page.tsx
git commit -m "feat(full-test): add results page"
```

---

### Task 3.6: Build and verify

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no ESLint errors.

- [ ] **Step 3: Run unit tests**

```bash
npx vitest run
```

Expected: all algorithm tests pass.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(full-test): complete full mock exam feature"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Schema changes → Tasks 1.1–1.2
- Adaptive algorithm (incl. Q1/Q2 warm-up) → Tasks 1.3–1.7
- Scoring/normalization → Tasks 1.7
- API endpoints → Tasks 2.1–2.5
- Resume + auto-submit → Task 2.5
- Cancel mark-as-cancelled → Task 2.4
- Frontend pages → Tasks 3.1–3.5
- Edge cases (duplicate start, pool exhaustion, skip confirmation) → Tasks 2.1, 2.2, 3.3

**2. Placeholder scan:** No TBD/TODO. All code blocks contain concrete implementation.

**3. Type consistency:** `CefrLevel` type reused across algorithm, constants, and API routes. Column names (`currentLevel`, `timeRemainingSeconds`, `lastActivityAt`, `adaptivePath`) match schema additions.
