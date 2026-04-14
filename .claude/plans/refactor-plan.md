# Test System Refactor Plan

## Overview
Refactor the test system to use consistent identifiers, numeric scores, per-answer storage, centralized types, and unified demo/real API flows.

## Step 1: Centralized Types (`src/types/test.ts`)
- Create single source of truth for all test-related types
- Cover all 4 test types with proper discriminated unions
- Define Question, TestType, Answer, Result, Article, Conversation types

## Step 2: Database Schema (`src/db/schema.ts`)
- Change `test_types.id` from `serial` to `varchar(50)` with test type name as PK
- Change `test_attempts.score` and `user_progress.averageScore` from `varchar(10)` to `numeric(5,2)`
- Create new `user_answers` table (attempt_id, question_id, selected_answer, is_correct)
- Keep `questions.testTypeId` as `varchar(50)` — now references string PK directly

## Step 3: Migration Script (`scripts/migrate-refactor.ts`)
- Drop and recreate all application tables with new schema
- Seed 4 test types with string PKs
- Re-seed structured sample questions for all 4 types
- Update seed-admin.ts to match new schema

## Step 4: API Refactor
- `/api/tests/[type]` — add `?demo=true` param, return explanations in demo mode
- `/api/tests/submit` — store per-question answers in `user_answers`, use numeric scores
- `/api/progress` — parse numeric scores, join user_answers for review
- Admin APIs — update to use string test type IDs

## Step 5: UI Component Consolidation
- Update all components to use centralized types from `src/types/test.ts`
- Unify demo pages to use same API with `?demo=true` instead of hardcoded data
- Remove duplicated type definitions across all page files
- Use existing components (FocusMeaningConversationCard, ListeningAudioPlayer, etc.) instead of inline markup

## Step 6: Verification
- Run `npm run build` to check for TypeScript errors
- Verify all imports resolve correctly
- Ensure no broken references
