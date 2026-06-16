import { db } from '@/db';
import { questionSelectionLogs } from '@/db/schema';
import { type CefrLevel } from './constants';

export type SelectionMode = 'exact' | 'fallback' | 'reuse';

export function determineSelectionMode(
  reused: boolean,
  selectedLevel: string,
  targetLevel: CefrLevel,
): SelectionMode {
  if (reused) return 'reuse';
  if (selectedLevel === targetLevel) return 'exact';
  return 'fallback';
}

export async function logQuestionSelection(params: {
  attemptId: number;
  testTypeId: string;
  questionId: number;
  targetLevel: CefrLevel;
  selectedLevel: string;
  mode: SelectionMode;
}): Promise<void> {
  try {
    await db.insert(questionSelectionLogs).values({
      attemptId: params.attemptId,
      testTypeId: params.testTypeId,
      questionId: params.questionId,
      targetLevel: params.targetLevel,
      selectedLevel: params.selectedLevel,
      mode: params.mode,
    });
  } catch (err) {
    console.warn('[logQuestionSelection] Failed to insert selection log:', err);
  }
}
