export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PerTypeLevels = Record<string, CefrLevel>;

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Non-linear weights reflecting real difficulty gaps between CEFR levels.
// Jumping from B2→C1 is much harder than A1→A2, so weights increase
// non-linearly to reward answering harder questions correctly.
export const CEFR_WEIGHTS: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 4,
  B2: 7,
  C1: 11,
  C2: 16,
};

// Weight multiplier for reused questions (previously seen by the user)
export const REUSE_WEIGHT_DISCOUNT = 0.5;

export const CEFR_SCORE_RANGES: Record<CefrLevel, { min: number; max: number }> = {
  A1: { min: 1, max: 20 },
  A2: { min: 21, max: 40 },
  B1: { min: 41, max: 60 },
  B2: { min: 61, max: 80 },
  C1: { min: 81, max: 100 },
  C2: { min: 101, max: 120 },
};

export const FULL_TEST_TOTAL_SECONDS = 60 * 60; // 60 minutes

// Minimum number of answers PER TYPE before the adaptive level can change.
// Prevents early-game instability from random guesses.
export const MIN_WINDOW_BEFORE_ADJUST = 3;

// Sliding window size for level adjustment (after MIN_WINDOW_BEFORE_ADJUST)
export const LEVEL_ADJUSTMENT_WINDOW = 5;

// Threshold for level adjustment.
// avg >= THRESHOLD_UP -> level up, avg <= THRESHOLD_DOWN -> level down
export const THRESHOLD_UP = 0.6;
export const THRESHOLD_DOWN = 0.4;

// Major step thresholds: very strong signal jumps 2 levels
export const MAJOR_STEP_UP = 0.9;
export const MAJOR_STEP_DOWN = 0.1;

// Minimum questions required for confident scoring result
export const MIN_QUESTIONS_FOR_CONFIDENT = 20;

// Question distribution: 15 grammar + 14 vocabulary + 1 cloze + 15 listening = 45
export const FULL_TEST_PART_DISTRIBUTION = [
  ...Array(15).fill('focus-form'),
  ...Array(14).fill('focus-meaning'),
  ...Array(1).fill('form-meaning'),
  ...Array(15).fill('listening'),
] as const;

export const FULL_TEST_TOTAL_QUESTIONS = FULL_TEST_PART_DISTRIBUTION.length; // 45

export const ADAPTIVE_TEST_TYPES = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'] as const;

export function cefrIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function clampLevel(index: number): CefrLevel {
  return CEFR_LEVELS[Math.max(0, Math.min(CEFR_LEVELS.length - 1, index))];
}