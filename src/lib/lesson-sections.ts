/**
 * Shared lesson-section types. Previously lived in
 * src/content/units-path-lessons.ts (deleted along with /units), but the
 * test-side explain system (TestExplainOverlay, TestExplainEditor,
 * api/admin/test-explains) still relies on them.
 */

/** A row inside a topic card. left = gray pill, right = optional result pill. */
export interface ReviewRow {
  left: string;
  right?: string;
}

/** A practice question embedded in the explanation flow (separate from the exam). */
export interface LessonPracticeQuestion {
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface LessonPractice {
  questions: LessonPracticeQuestion[];
}

export interface LessonExample {
  en: string;
  th?: string;
  ok?: boolean;
}

export interface LessonTable {
  headers: string[];
  rows: string[][];
}

export type LessonSectionType = 'rule' | 'detailedRule' | 'importantNote' | 'practice';

/** Tap & Select — each item has its own prompt + 2 editable choices */
export interface TapItem {
  prompt: string;
  choiceA: string;
  choiceB: string;
  /** index of the correct choice: 0 = choiceA, 1 = choiceB */
  correct: 0 | 1;
}

export interface TapExercise {
  title: string;
  items: TapItem[];
}

/**
 * A configurable lesson section. Each item chooses its own presentation type,
 * and carries only the data needed by that block (legacy fields stay optional
 * so existing saved lessons remain readable/editable).
 */
export interface ReviewTopic {
  type?: LessonSectionType;
  heading?: string;
  body?: string;
  /** Yellow chip label for rule cards */
  chip?: string;
  /** Description next to the chip (supports **bold** / ==highlight==) */
  description?: string;
  /** Pattern/example rows */
  rows?: ReviewRow[];
  examples?: LessonExample[];
  practice?: LessonPractice;
  tap?: TapExercise;
  /** Historical type marker accepted while normalizing older saved sections. */
  legacyType?: string;
  /** ℹ️ tip line at the card bottom (optional) */
  tip?: string;
}

export interface LessonSection extends ReviewTopic {}

const SECTION_TYPES: readonly LessonSectionType[] = ['rule', 'detailedRule', 'importantNote', 'practice'];

export function inferLessonSectionType(section: Partial<LessonSection>): LessonSectionType {
  const legacy = section as Partial<LessonSection> & { type?: string; legacyType?: string };
  if (legacy.type && SECTION_TYPES.includes(legacy.type as LessonSectionType)) return legacy.type as LessonSectionType;
  if (legacy.type === 'practice' || (section.practice && !legacy.type && !legacy.legacyType)) return 'practice';
  if (['note', 'tip'].includes(legacy.type ?? '') || ['note', 'tip'].includes(legacy.legacyType ?? '')) return 'importantNote';
  if (['text', 'table'].includes(legacy.type ?? '') || ['text', 'table'].includes(legacy.legacyType ?? '')) return 'detailedRule';
  if (legacy.legacyType === 'examples') return 'rule';
  if (section.examples?.length) return 'rule';
  if (section.tip && !section.chip && !section.rows?.length) return 'importantNote';
  if (section.chip || section.description || section.rows?.length) return 'rule';
  return 'detailedRule';
}

/** Convert saved legacy section shapes into the current four-component model. */
export function normalizeLessonSection(value: unknown): LessonSection {
  const section = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rows = (Array.isArray(section.rows) ? section.rows : []).flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    return typeof item.left === 'string' ? [{ left: item.left, right: typeof item.right === 'string' ? item.right : undefined }] : [];
  });
  const examples = Array.isArray(section.examples) ? section.examples.flatMap((example) => {
    if (!example || typeof example !== 'object') return [];
    const item = example as Record<string, unknown>;
    return typeof item.en === 'string' ? [{ en: item.en, th: typeof item.th === 'string' ? item.th : undefined, ok: typeof item.ok === 'boolean' ? item.ok : undefined }] : [];
  }) : [];
  const tableValue = section.table && typeof section.table === 'object' ? section.table as Record<string, unknown> : null;
  const table = tableValue && Array.isArray(tableValue.headers) && Array.isArray(tableValue.rows)
    ? { headers: tableValue.headers.map((header) => String(header ?? '')), rows: tableValue.rows.filter(Array.isArray).map((row) => row.map((cell: unknown) => String(cell ?? ''))) }
    : undefined;
  const practiceValue = section.practice && typeof section.practice === 'object' ? section.practice as Record<string, unknown> : null;
  const rawQuestions = practiceValue && Array.isArray(practiceValue.questions)
    ? practiceValue.questions
    : practiceValue && typeof practiceValue.sentence === 'string' ? [practiceValue] : [];
  const questions = rawQuestions.flatMap((question) => {
    if (!question || typeof question !== 'object') return [];
    const item = question as Record<string, unknown>;
    if (typeof item.sentence !== 'string' || !Array.isArray(item.options) || typeof item.answerIndex !== 'number') return [];
    return [{ sentence: item.sentence, options: item.options.map((option) => String(option ?? '')), answerIndex: item.answerIndex, explanation: typeof item.explanation === 'string' ? item.explanation : undefined }];
  });

  const originalType = typeof section.type === 'string' ? section.type : undefined;
  const legacyType = typeof section.legacyType === 'string' ? section.legacyType : originalType;
  const normalized: LessonSection = {
    type: undefined,
    legacyType: legacyType === 'rule' || legacyType === 'detailedRule' || legacyType === 'importantNote' || legacyType === 'practice' ? undefined : legacyType,
    heading: typeof section.heading === 'string' ? section.heading : undefined,
    body: typeof section.body === 'string' ? section.body : undefined,
    chip: typeof section.chip === 'string' ? section.chip : undefined,
    description: typeof section.description === 'string' ? section.description : undefined,
    rows,
    examples,
    practice: questions.length ? { questions } : undefined,
    tap: section.tap && typeof section.tap === 'object' ? section.tap as LessonSection['tap'] : undefined,
    tip: typeof section.tip === 'string' ? section.tip : undefined,
  };
  normalized.type = originalType && SECTION_TYPES.includes(originalType as LessonSectionType)
    ? originalType as LessonSectionType
    : inferLessonSectionType({ ...normalized, legacyType });

  if (table && normalized.type === 'detailedRule' && rows.length === 0) {
    normalized.rows = table.rows.map((row) => ({
      left: table.headers.slice(0, -1).map((header, index) => header ? `${header}: ${row[index] ?? ''}` : row[index] ?? '').filter(Boolean).join(' · ') || row[0] || '',
      right: row.length > 1 ? row[row.length - 1] : undefined,
    }));
  } else if (table && normalized.type === 'rule') {
    normalized.examples = [...examples, ...table.rows.map((row) => ({ en: row.join(' · ') }))];
  }
  if (normalized.type === 'importantNote') {
    normalized.heading ||= legacyType === 'tip' || legacyType === 'note' ? 'จุดสำคัญที่ควรจำ' : undefined;
    normalized.body ||= normalized.tip;
  }
  return normalized;
}

export function normalizeLessonSections(values: unknown, legacyPageFields?: { intro?: string | null; tip?: string | null }): LessonSection[] {
  const sections = Array.isArray(values) ? values.map(normalizeLessonSection) : [];
  const intro = legacyPageFields?.intro?.trim();
  if (intro && !sections.some((section) => section.body?.trim() === intro)) {
    sections.push({ type: 'detailedRule', heading: 'บทนำ', body: intro });
  }
  const tip = legacyPageFields?.tip?.trim();
  if (tip && !sections.some((section) => section.body?.trim() === tip || section.tip?.trim() === tip)) {
    sections.push({ type: 'importantNote', heading: 'จุดสำคัญที่ควรจำ', body: tip });
  }
  return sections;
}
