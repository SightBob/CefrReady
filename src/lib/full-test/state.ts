import type { DbQuestion } from '@/db/schema';
import type { CefrLevel, PerTypeLevels } from './constants';

export interface AttemptPathEntry {
  questionId: number;
  testTypeId: string;
  cefrLevel: CefrLevel;
  difficulty: string | null;
  wasCorrect: boolean;
  selectedAnswer: string;
  orderIndex: number;
  reused?: boolean;
  questionSnapshot?: DbQuestion;
}

export interface CurrentSelection {
  questionId: number;
  slot: number;
  reused: boolean;
}

// Reserved JSONB keys keep operational state separate from CEFR part levels.
export function readSelection(levels: Record<string, string> | null): CurrentSelection | null {
  try {
    const selection: unknown = JSON.parse(levels?.__selection ?? 'null');
    if (!selection || typeof selection !== 'object') return null;
    const value = selection as Partial<CurrentSelection>;
    return Number.isInteger(value.questionId) && Number.isInteger(value.slot) && typeof value.reused === 'boolean'
      ? value as CurrentSelection : null;
  } catch {
    return null;
  }
}

export function withSelection(levels: Record<string, string>, selection: CurrentSelection | null): Record<string, string> {
  const next = { ...levels };
  if (selection) next.__selection = JSON.stringify(selection);
  else delete next.__selection;
  return next;
}

export function partLevels(levels: Record<string, string> | null, defaults: PerTypeLevels): PerTypeLevels {
  return Object.fromEntries(Object.keys(defaults).map((part) => [part, levels?.[part] ?? defaults[part]])) as PerTypeLevels;
}
