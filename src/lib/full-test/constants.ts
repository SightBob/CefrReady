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
  ...Array(15).fill('focus-form'),
  ...Array(14).fill('focus-meaning'),
  'form-meaning',
  ...Array(15).fill('listening'),
] as const;

export const FULL_TEST_TOTAL_QUESTIONS = FULL_TEST_PART_DISTRIBUTION.length; // 45

export function cefrIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function clampLevel(index: number): CefrLevel {
  return CEFR_LEVELS[Math.max(0, Math.min(CEFR_LEVELS.length - 1, index))];
}
