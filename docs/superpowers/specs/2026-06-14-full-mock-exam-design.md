# Full Mock Exam — Design Document

**Date:** 2026-06-14  
**Feature:** `/tests/full` — Adaptive full CEFR mock exam  
**Status:** Approved for implementation planning

---

## 1. Overview

Create a new `/tests/full` route that delivers a 45-question mock exam combining all test parts:

- Focus on Form: 15 questions
- Focus on Meaning: 14 questions
- Listening: 15 questions
- Form & Meaning: 1 question

The exam uses a **real-time adaptive algorithm** that adjusts question difficulty based on the user's previous answers. It runs for **60 minutes**, cannot be paused, and locks each answer once submitted (no going back).

The final score is normalized to a **1–120 scale** and mapped to a CEFR level:

| CEFR Level | Score Range |
|------------|-------------|
| C2         | 101 – 120   |
| C1         | 81 – 100    |
| B2         | 61 – 80     |
| B1         | 41 – 60     |
| A2         | 21 – 40     |
| A1         | 1 – 20      |

---

## 2. Goals

- Provide a realistic full-exam experience before the real test.
- Adapt difficulty per question to estimate the user's true CEFR level.
- Persist progress to the database so users can resume after refresh or disconnect.
- Record the adaptive path for post-exam analytics.

---

## 3. Schema Changes

Add the following columns to `test_attempts`:

| Column                    | Type      | Description                                                                 |
|---------------------------|-----------|-----------------------------------------------------------------------------|
| `adaptive_path`           | JSONB     | Array of `{ questionId, testTypeId, cefrLevel, difficulty, wasCorrect, orderIndex }` |
| `status`                  | varchar   | `'in_progress'` \| `'completed'` \| `'cancelled'`                             |
| `current_level`           | varchar   | Current CEFR level during the attempt                                       |
| `time_remaining_seconds`  | integer   | Last recorded remaining time                                                |
| `last_activity_at`        | timestamp | Last time the user answered a question                                      |

Existing columns (`score`, `totalQuestions`, `correctAnswers`, `startedAt`, `completedAt`) continue to be used.

---

## 4. API Endpoints

### `POST /api/tests/full/start`
- Requires authentication.
- Checks for an existing `in_progress` attempt. If found, redirects/resumes instead of creating a duplicate.
- Determines the starting CEFR level from `user_progress.overall.averageScore` (default B1 if unavailable).
- Creates a new `test_attempts` row with `status = 'in_progress'`.
- Selects and returns the first question.

### `POST /api/tests/full/next`
- Receives `{ attemptId, questionId, selectedAnswer, timeRemaining }`.
- Validates the attempt belongs to the current user and is `in_progress`.
- Records the answer in `adaptive_path`.
- Updates `last_activity_at` and `time_remaining_seconds`.
- Runs the adaptive algorithm to determine the next CEFR level.
- Selects the next question, prioritising questions the user has not seen before.
- Returns the next question and the current exam state.

### `POST /api/tests/full/submit`
- Final submission (either user clicks finish or time runs out).
- Calculates raw score from question weights.
- Normalizes to a 1–120 scale.
- Maps to CEFR level.
- Updates `test_attempts.status = 'completed'`.
- Stores per-question answers in `user_answers`.
- Returns full results.

### `POST /api/tests/full/cancel`
- Marks the attempt's `status` as `'cancelled'`.
- Does **not** delete the row (kept for analytics).
- Cancelled attempts are excluded from resume checks and progress aggregation.

### `GET /api/tests/full/resume`
- Returns the latest `in_progress` attempt for the user, if any.
- Calculates real remaining time: `time_remaining_seconds - (now - last_activity_at)`.
- If the result is `<= 0`, auto-submits the attempt immediately and returns results instead of resuming.

---

## 5. Adaptive Algorithm

### CEFR Levels & Question Weights

| CEFR Level | Weight |
|------------|--------|
| A1         | 1      |
| A2         | 2      |
| B1         | 3      |
| B2         | 4      |
| C1         | 5      |
| C2         | 6      |

### Starting Level
- Use `estimateCefrLevel(userProgress.overall.averageScore)`.
- If no progress exists, default to **B1**.

### Level Adjustment Rules

Correct answer = 1, incorrect = 0.

- **Question 1:** No prior data. Use the result of this question only.
  - Correct → move up 1 level.
  - Incorrect → move down 1 level.

  **Note:** Since slot 1 is always a `form-meaning` question (all-or-nothing scoring per Section 6), this means the first level adjustment is based on an all-or-nothing result for a multi-blank item. This is an accepted design tradeoff — it may slightly bias the early trajectory downward if the user gets some but not all blanks correct on question 1.
- **Question 2:** Use the average of the last 2 answers.
  - Average ≥ 0.7 → move up 1 level.
  - Average ≤ 0.3 → move down 1 level.
  - Otherwise → stay.
- **Question 3 onwards:** Use a weighted average of the last 3–5 answers.
  - Same thresholds: ≥ 0.7 up, ≤ 0.3 down, otherwise stay.

Level changes are capped at A1 (lowest) and C2 (highest).

### Question Selection

1. Determine the target CEFR level.
2. Within that level, select a question the user has **not yet seen** in this attempt.
3. If all questions at that level have been used, fall back to the nearest CEFR level that still has unused questions.
4. If absolutely no unused questions remain anywhere, use a previously seen question. If the pool is empty, end the test early.
5. Respect the part distribution: the selected question must belong to the next required part in the sequence (see Part Distribution).

**Note:** Fallback applies only to the CEFR level dimension. The part type (testTypeId) for each slot is always fixed per the Part Distribution sequence and is never changed by fallback logic. The algorithm filters by (fixed part type for this slot) AND (target/fallback CEFR level).

### Part Distribution

The exam always delivers exactly 45 questions in this fixed distribution:

1. Focus on Form & Meaning: 1 question
2. Focus on Form: 15 questions
3. Focus on Meaning: 14 questions
4. Listening: 15 questions

The adaptive algorithm selects the CEFR level for each slot, but the **part type is fixed per position** in the sequence. For example, slot 1 is always `form-meaning`, slots 2–16 are always `focus-form`, etc.

---

## 6. Scoring & Normalization

- **Raw score** = sum of weights for all correctly answered questions.
- **Max possible score** = sum of weights for all questions actually delivered.
- **Normalized score** = `(rawScore / maxPossibleScore) * 120`.
- The normalized score is then mapped to the CEFR table in Section 1.
- If the test ends early (pool exhausted), `maxPossibleScore` is based only on the delivered questions.

### Form & Meaning Scoring

The single `form-meaning` question is an article with multiple blanks. It counts as **1 question = 1 point**.
- All blanks correct → 1 point.
- Any blank incorrect → 0 points for that question.

---

## 7. State Persistence & Resume

- Every `POST /api/tests/full/next` call stores:
  - `adaptive_path` (updated with the latest answer)
  - `current_level`
  - `time_remaining_seconds`
  - `last_activity_at = now()`
- The client sends `timeRemaining` from its timer on each request.
- The server never trusts the client clock for final time calculation; it uses `last_activity_at`.

### Resume Flow

1. `GET /api/tests/full/resume` finds the latest `in_progress` attempt.
2. Calculate real remaining time:
   ```
   realRemaining = time_remaining_seconds - (now - last_activity_at)
   ```
3. If `realRemaining <= 0`:
   - Auto-submit the attempt using all answered questions in `adaptive_path`.
   - Return the results page.
4. Otherwise:
   - Return the saved state so the client can continue from the next question.

---

## 8. Cancel Behavior

- `POST /api/tests/full/cancel` sets `status = 'cancelled'`.
- The row remains in the database for analytics.
- Cancelled attempts:
  - Are excluded from `GET /api/tests/full/resume`.
  - Are excluded from `user_progress` aggregation.
  - Do not appear in results/review history.

---

## 9. Edge Cases & Defensive Logic

1. **Auto-submit on expired resume**  
   When resuming, if time has run out, the system auto-submits using all answers already recorded in `adaptive_path`. Unanswered questions are omitted. Both `rawScore` and `maxPossibleScore` are calculated from the delivered/answered questions only.

2. **Duplicate `in_progress` attempt on Start**  
   `POST /api/tests/full/start` checks for an existing `in_progress` attempt. If found, it returns the existing attempt state (or redirects to resume) instead of creating a new one. Only one `in_progress` full exam is allowed per user at a time.

3. **Exhausted question pool**  
   If the target CEFR level and both neighbouring levels have no unused questions, the system falls back to reusing any previously seen question. If the entire pool is exhausted, the exam ends early and submits with the questions delivered so far.

4. **User not authenticated**  
   The `/tests/full` intro page is visible, but the Start button is replaced with a login prompt. All API endpoints require authentication.

5. **Time runs out during the exam**  
   The client timer auto-submits the exam when it reaches zero. The server also enforces the time limit on resume.

6. **Skipping a question**  
   If the user presses Next without selecting an answer, show a confirmation: "ข้ามข้อนี้?" If confirmed, the answer is recorded as incorrect and the next question is delivered.

---

## 10. Frontend Pages & Components

### Pages

- `/tests` — Add a prominent "Full Mock Exam" card at the top. Existing section cards remain below.
- `/tests/full` — Intro page with CEFR score table, part distribution, rules, and Start button.
- `/tests/full/exam` — Active exam UI.
- `/tests/full/results` — Results page with total score, CEFR level, per-part breakdown, and adaptive path summary. Handles early termination gracefully if the question pool is exhausted before 45 questions.

### Reused Components

- `TestLayout` — timer, progress bar, navigation (Next only, no Previous).
- `FocusFormQuestionCard` — for `focus-form` questions.
- `FocusMeaningConversationCard` — for `focus-meaning` questions.
- `ListeningAudioPlayer` — for `listening` questions.
- `FormMeaningQuiz` — for the single `form-meaning` question.
- `TestResults` — extended to show per-part breakdown.

### Exam UI Requirements

- Show timer counting down from 60 minutes continuously.
- Show progress: "Question X of 45" (or "Question X of N" if the exam ends early due to pool exhaustion).
- No Pause button.

**Note:** If the exam ends early due to pool exhaustion (Section 9.3), the progress indicator and results page must handle N < 45 questions gracefully:
- Exam UI: "Question X of N" where N is the actual planned total (may be reduced mid-exam if pool exhaustion is detected early — though typically this would only be known near the end).
- Results page: per-part breakdown and overall summary are based on questions actually delivered, not a hardcoded 45.
- No Previous button.
- Confirm before skipping an unanswered question.
- Show Cancel Exam button with confirmation.

---

## 11. Out of Scope

### Calibration Questions

Calibration questions (fixed warm-up items before adaptive kicks in) are intentionally **excluded from this scope**. The design uses the first 1–2 real questions for warm-up logic instead. If calibration questions are desired later, they will be handled as a separate phase.

---

## 12. Testing Notes

- Unit test the adaptive algorithm with synthetic answer sequences.
- Verify normalization math across different question-level combinations.
- Test resume with expired time.
- Test duplicate-start prevention.
- Test pool exhaustion fallback.
- Verify cancelled attempts do not affect progress.

---

## 13. Implementation Plan Reminder

The implementation should be split into at least three phases:

1. **Schema + Algorithm** — migration, adaptive algorithm, unit tests.
2. **API Endpoints** — start, next, submit, cancel, resume.
3. **Frontend Pages** — intro, exam, results, plus the card on `/tests`.
