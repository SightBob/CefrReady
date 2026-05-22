export interface Sm2Result {
  easeFactor: number;
  reviewInterval: number;
  nextReviewAt: Date;
  status: 'new' | 'learning' | 'mastered';
}

const VALID_QUALITIES = [1, 3, 4, 5] as const;
export type Sm2Quality = (typeof VALID_QUALITIES)[number];

export function isValidQuality(q: number): q is Sm2Quality {
  return (VALID_QUALITIES as readonly number[]).includes(q);
}

/**
 * SM-2 Algorithm (SuperMemo 2)
 *
 * quality: 1 = Again, 3 = Hard, 4 = Good, 5 = Easy
 */
export function sm2(
  quality: Sm2Quality,
  easeFactor: number,
  reviewInterval: number,
  consecutiveCorrect: number
): Sm2Result {
  // Calculate new ease factor (minimum 1.3)
  const newEF = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const isCorrect = quality >= 3;

  let newInterval: number;
  let newStatus: 'new' | 'learning' | 'mastered';

  if (!isCorrect) {
    newInterval = 1;
    newStatus = 'learning';
  } else if (consecutiveCorrect === 0 || reviewInterval === 0) {
    newInterval = 1;
    newStatus = 'learning';
  } else if (consecutiveCorrect === 1) {
    newInterval = 6;
    newStatus = 'learning';
  } else {
    newInterval = Math.round(reviewInterval * newEF);
    newStatus = 'mastered';
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  nextReviewAt.setHours(0, 0, 0, 0);

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    reviewInterval: newInterval,
    nextReviewAt,
    status: newStatus,
  };
}
