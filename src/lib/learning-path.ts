import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

// ============================================================
// Shared types — used by both public pages and the admin panel
// ============================================================

export type UnitColorKey = 'green' | 'blue' | 'purple' | 'orange';

/** A table block inside a lesson section */
export interface LessonTable {
  /** Column headers; the first column is treated as the row label */
  headers: string[];
  rows: string[][];
}

export interface LessonSection {
  heading: string;
  body: string;
  examples?: Array<{ en: string; th: string; ok: boolean }>;
  table?: LessonTable;
}

export interface QuizQuestion {
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface VocabRow {
  subject: string;
  verbForm: string;
  example: string;
}

/** คลังศัพท์ช่วยชีวิต — table with a flexible number of columns */
export interface VocabBankData {
  /** Column headers, e.g. ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'] — 2..8 columns */
  columns: string[];
  /** Cell values; each row should match the column count (padded/truncated on read) */
  rows: string[][];
}

/**
 * Accepts both vocab-bank storage shapes:
 * - legacy: VocabRow[] (fixed subject/verbForm/example fields)
 * - current: { columns, rows }
 * Returns null when empty/invalid so the UI hides the vocab button.
 */
export function normalizeVocabBank(value: unknown): VocabBankData | null {
  const DEFAULT_COLUMNS = ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'];

  // Legacy shape: array of {subject, verbForm, example}
  if (Array.isArray(value)) {
    const rows = value
      .map((r) => {
        const row = r as Partial<VocabRow>;
        return [row.subject ?? '', row.verbForm ?? '', row.example ?? ''];
      })
      .filter((cells) => cells.some((c) => c.trim() !== ''));
    return rows.length > 0 ? { columns: [...DEFAULT_COLUMNS], rows } : null;
  }

  // Current shape: { columns, rows }
  if (value && typeof value === 'object') {
    const obj = value as { columns?: unknown; rows?: unknown };
    if (
      Array.isArray(obj.columns) &&
      obj.columns.length >= 2 &&
      obj.columns.every((c) => typeof c === 'string' && c.trim() !== '') &&
      Array.isArray(obj.rows)
    ) {
      const cols = obj.columns.map((c) => (c as string).trim());
      const rows = (obj.rows as unknown[])
        .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : []))
        .map((cells) => {
          // pad/trim to column count
          const padded = [...cells.slice(0, cols.length)];
          while (padded.length < cols.length) padded.push('');
          return padded;
        })
        .filter((cells) => cells.some((c) => c.trim() !== ''));
      return rows.length > 0 ? { columns: cols, rows } : null;
    }
  }

  return null;
}

export interface LessonPageData {
  id: number;
  pageType: 'explain' | 'quiz';
  /** Short "จำไว้เลย" summary — optional; hidden when empty */
  intro: string | null;
  sections: LessonSection[];
  quiz: QuizQuestion | null;
  vocabBank: VocabBankData | null;
  tip: string | null;
  orderIndex: number;
}

export interface PathNodeData {
  id: number;
  title: string;
  kind: 'star' | 'chest' | 'trophy';
  orderIndex: number;
  pages: LessonPageData[];
}

export interface UnitData {
  id: number;
  title: string;
  subtitle: string | null;
  colorKey: UnitColorKey;
  orderIndex: number;
  nodes: PathNodeData[];
}

/** Fetch all published units with their nodes and lesson pages, ordered. */
export async function fetchLearningPath(): Promise<UnitData[]> {
  const units = await db
    .select()
    .from(learningUnits)
    .where(eq(learningUnits.isPublished, true))
    .orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));

  const nodes = await db
    .select()
    .from(learningNodes)
    .where(eq(learningNodes.isPublished, true))
    .orderBy(asc(learningNodes.unitId), asc(learningNodes.orderIndex), asc(learningNodes.id));

  const pages = await db
    .select()
    .from(lessonPages)
    .orderBy(asc(lessonPages.nodeId), asc(lessonPages.orderIndex), asc(lessonPages.id));

  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    subtitle: unit.subtitle,
    colorKey: (unit.colorKey as UnitColorKey) ?? 'green',
    orderIndex: unit.orderIndex,
    nodes: nodes
      .filter((n) => n.unitId === unit.id)
      .map((n) => ({
        id: n.id,
        title: n.title,
        kind: (n.kind as PathNodeData['kind']) ?? 'star',
        orderIndex: n.orderIndex,
        pages: pages
          .filter((p) => p.nodeId === n.id)
          .map((p) => ({
            id: p.id,
            pageType: p.pageType as LessonPageData['pageType'],
            intro: p.intro ?? null,
            sections: p.sections ?? [],
            quiz: p.quiz ?? null,
            vocabBank: normalizeVocabBank(p.vocabBank),
            tip: p.tip ?? null,
            orderIndex: p.orderIndex,
          })),
      })),
  }));
}

/** Fetch one node with its pages for the lesson view. */
export async function fetchNodeLesson(
  nodeId: number
): Promise<{ node: PathNodeData; unit: UnitData } | null> {
  const [node] = await db
    .select()
    .from(learningNodes)
    .where(eq(learningNodes.id, nodeId))
    .limit(1);
  if (!node || !node.isPublished) return null;

  const [unit] = await db
    .select()
    .from(learningUnits)
    .where(eq(learningUnits.id, node.unitId))
    .limit(1);
  if (!unit || !unit.isPublished) return null;

  const pages = await db
    .select()
    .from(lessonPages)
    .where(eq(lessonPages.nodeId, nodeId))
    .orderBy(asc(lessonPages.orderIndex), asc(lessonPages.id));

  return {
    node: {
      id: node.id,
      title: node.title,
      kind: (node.kind as PathNodeData['kind']) ?? 'star',
      orderIndex: node.orderIndex,
      pages: pages.map((p) => ({
        id: p.id,
        pageType: p.pageType as LessonPageData['pageType'],
        intro: p.intro ?? null,
        sections: p.sections ?? [],
        quiz: p.quiz ?? null,
        vocabBank: normalizeVocabBank(p.vocabBank),
        tip: p.tip ?? null,
        orderIndex: p.orderIndex,
      })),
    },
    unit: {
      id: unit.id,
      title: unit.title,
      subtitle: unit.subtitle,
      colorKey: (unit.colorKey as UnitColorKey) ?? 'green',
      orderIndex: unit.orderIndex,
      nodes: [],
    },
  };
}
