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

export type LessonSectionType = 'rule' | 'detailedRule' | 'importantNote' | 'practice' | 'formulaBreakdown' | 'typeBreakdown';

/**
 * โทนสีพื้นของแถบประโยคใน "Core Formula breakdown"
 * (`purple` = #E6E6FC, `yellow` = #FFF5CF)
 */
export type FormulaBarTone = 'purple' | 'yellow';

/**
 * คอลัมน์ซ้าย/ขวาของ "Core Formula breakdown" — ประโยคในแถบสี + คำอธิบายใต้แถบ
 * (Figma node 419:56249)
 */
export interface FormulaColumn {
  /** ประโยคในแถบสี — ใช้ ==คำที่ต้องเน้น== เพื่อแสดงเป็นชิปพื้นขาวในประโยค */
  sentence: string;
  /** คำอธิบายใต้แถบสี (แสดงเป็นข้อความ bullet) */
  note: string;
  /**
   * สีพื้นแถบประโยคเมื่อไม่ต้องการใช้สีตามตำแหน่งคอลัมน์
   *
   * ไม่ระบุ = ซ้าย `purple` / ขวา `yellow` (Figma 419:56249)
   *
   * Figma ใช้สีไม่เหมือนกันทุกการ์ด — การ์ด “ประโยคบอกเล่า (+) ต้องตามด้วย ประโยคปฏิเสธ (-)”
   * (419:56107) วาง yellow ไว้ฝั่งซ้ายและ purple ฝั่งขวา ขณะที่การ์ด “ประโยคปฏิเสธ (-) ต้องตามด้วย
   * ประโยคบอกเล่า (+)” (419:56249) กลับกัน จึงเลือกสีแยกได้ทีละคอลัมน์
   */
  tone?: FormulaBarTone;
}

/** อ่านค่า tone ที่บันทึกไว้ — ค่าที่ไม่รู้จักถือว่า "ใช้สีตามตำแหน่งคอลัมน์" */
export function normalizeFormulaBarTone(value: unknown): FormulaBarTone | undefined {
  const tone = String(value ?? '').trim().toLowerCase();
  return tone === 'purple' || tone === 'yellow' ? tone : undefined;
}

/** หนึ่งเคส (หนึ่งแถว) ของ Core Formula breakdown */
export interface FormulaCase {
  /** ป้ายหัวข้อเคส เช่น "เคส Is / Am / Are - ปฏิเสธ :" */
  label: string;
  /** ประโยคตัวอย่างเต็มของเคส แสดงต่อท้ายป้าย เช่น "It isn't cold today, is it?" */
  example: string;
  left: FormulaColumn;
  right: FormulaColumn;
}

/** Layout "Core Formula breakdown" — เทียบสูตรซ้าย/ขวาทีละเคส (หัวการ์ดใช้ `heading`) */
export interface FormulaBreakdown {
  cases: FormulaCase[];
}

/** สีพื้นมาตรฐานของป้าย Type เมื่อเคสไม่ได้ระบุสีเอง (ตรงกับ Figma 419:56463) */
export const TYPE_BREAKDOWN_DEFAULT_COLOR = '#8ACB66';

/**
 * หนึ่งเคสของ "Type Breakdown" (Figma node 419:56446)
 * แถวบน: ป้าย Type (สีต่างกันได้ตามเคส) + คำอธิบายสั้น
 * แถวกลาง: ช่องโครงสร้างสูตร → ประโยคตัวอย่าง (เน้นคำด้วยชิปพื้นขาว)
 * แถวล่าง: บรรทัดสรุปท้ายเคสพร้อมไอคอน
 */
export interface TypeBreakdownCase {
  /** ป้าย Type เช่น "Type 1 :" */
  label: string;
  /** สีพื้นของป้าย (hex) — ไม่ระบุ = `TYPE_BREAKDOWN_DEFAULT_COLOR` */
  color?: string;
  /** คำอธิบายสั้นข้างป้าย เช่น "มีโอกาสเกิดขึ้นจริงในอนาคต" */
  description: string;
  /** ช่องโครงสร้างสูตร เช่น "โครงสร้าง: If + V.1 , will + V.1" */
  structure: string;
  /** ประโยคตัวอย่าง — ใช้ ==คำที่ต้องเน้น== เพื่อแสดงเป็นชิปพื้นขาว */
  example: string;
  /** บรรทัดสรุปท้ายเคส (มีไอคอนนำหน้า) เช่น "ปัจจุบันคู่กับอนาคต (V.1 คู่ will)" */
  note: string;
}

/** Layout "Type Breakdown" — แยกตาม Type ทีละเคส (หัวการ์ดใช้ `heading`, คำโปรยใช้ `description`) */
export interface TypeBreakdown {
  cases: TypeBreakdownCase[];
}

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
  /**
   * Mini Quiz — ใช้ได้ทั้ง section type 'practice' (การ์ดแยก) และฝังมากับการ์ดเนื้อหา
   * (rule / detailedRule / formulaBreakdown / importantNote) ให้แสดงต่อจากเนื้อหาการ์ด
   */
  practice?: LessonPractice;
  /** หัวข้อของการ์ด Mini Quiz ที่ฝังมากับการ์ดเนื้อหา (ไม่ระบุ = ใช้หัวข้อมาตรฐาน) */
  quizHeading?: string;
  /** ข้อมูลของ layout "Core Formula breakdown" (ใช้เมื่อ type = 'formulaBreakdown') */
  formula?: FormulaBreakdown;
  /** ข้อมูลของ layout "Type Breakdown" (ใช้เมื่อ type = 'typeBreakdown') */
  typeBreakdown?: TypeBreakdown;
  tap?: TapExercise;
  /**
   * สถานะรายส่วน: `'draft'` = ยังไม่เสร็จ ห้ามแสดงให้ผู้เรียน (ไม่ระบุ = `'published'`)
   * ใช้ทยอยเปิดใช้เนื้อหาเป็นส่วน ๆ โดยที่เรื่องนั้นยังเผยแพร่รวมอยู่ได้
   */
  visibility?: 'draft' | 'published';
  /** Historical type marker accepted while normalizing older saved sections. */
  legacyType?: string;
  /** ℹ️ tip line at the card bottom (optional) */
  tip?: string;
}

export interface LessonSection extends ReviewTopic {}

const SECTION_TYPES: readonly LessonSectionType[] = ['rule', 'detailedRule', 'importantNote', 'practice', 'formulaBreakdown', 'typeBreakdown'];

/** ชื่อ type เก่า/ชื่อเล่นที่ยอมรับสำหรับ layout Core Formula breakdown */
const FORMULA_TYPE_ALIASES = ['formula', 'formulabreakdown', 'coreformula'];

/** ชื่อ type เก่า/ชื่อเล่นที่ยอมรับสำหรับ layout Type Breakdown */
const TYPE_BREAKDOWN_ALIASES = ['typebreakdown', 'typebreakdowncard', 'types'];

/** สี hex ที่ยอมรับจากข้อมูลที่บันทึกไว้ (ใช้กับป้าย Type) */
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

/** อ่านค่า formula จากข้อมูลดิบ — คืน undefined เมื่อไม่มีเคสที่ใช้งานได้เลย */
function normalizeFormula(value: unknown): FormulaBreakdown | undefined {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const rawCases = source && Array.isArray(source.cases) ? source.cases : [];
  const cases: FormulaCase[] = rawCases.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as Record<string, unknown>;
    const readColumn = (column: unknown): FormulaColumn => {
      const col = column && typeof column === 'object' ? column as Record<string, unknown> : {};
      const tone = normalizeFormulaBarTone(col.tone);
      return {
        sentence: typeof col.sentence === 'string' ? col.sentence : '',
        note: typeof col.note === 'string' ? col.note : '',
        ...(tone ? { tone } : {}),
      };
    };
    const formulaCase: FormulaCase = {
      label: typeof entry.label === 'string' ? entry.label : '',
      example: typeof entry.example === 'string' ? entry.example : '',
      left: readColumn(entry.left),
      right: readColumn(entry.right),
    };
    // เคสที่ยังว่างทุกช่องถูกตัดทิ้ง — ไม่ให้เกิดแถวเปล่าในการ์ด
    const hasContent = [formulaCase.label, formulaCase.example, formulaCase.left.sentence, formulaCase.left.note, formulaCase.right.sentence, formulaCase.right.note]
      .some((text) => text.trim().length > 0);
    return hasContent ? [formulaCase] : [];
  });
  return cases.length ? { cases } : undefined;
}

/** อ่านค่า typeBreakdown จากข้อมูลดิบ — คืน undefined เมื่อไม่มีเคสที่ใช้งานได้เลย */
function normalizeTypeBreakdown(value: unknown): TypeBreakdown | undefined {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const rawCases = source && Array.isArray(source.cases) ? source.cases : [];
  const cases: TypeBreakdownCase[] = rawCases.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as Record<string, unknown>;
    const text = (key: keyof TypeBreakdownCase) => (typeof entry[key] === 'string' ? entry[key] as string : '');
    const color = typeof entry.color === 'string' && HEX_COLOR.test(entry.color.trim()) ? entry.color.trim() : undefined;
    const typeCase: TypeBreakdownCase = {
      label: text('label'),
      color,
      description: text('description'),
      structure: text('structure'),
      example: text('example'),
      note: text('note'),
    };
    // เคสที่ยังว่างทุกช่องถูกตัดทิ้ง — ไม่ให้เกิดแถวเปล่าในการ์ด
    const hasContent = [typeCase.label, typeCase.description, typeCase.structure, typeCase.example, typeCase.note]
      .some((content) => content.trim().length > 0);
    return hasContent ? [typeCase] : [];
  });
  return cases.length ? { cases } : undefined;
}

export function inferLessonSectionType(section: Partial<LessonSection>): LessonSectionType {
  const legacy = section as Partial<LessonSection> & { type?: string; legacyType?: string };
  if (legacy.type && SECTION_TYPES.includes(legacy.type as LessonSectionType)) return legacy.type as LessonSectionType;
  if (legacy.type === 'practice' || (section.practice && !legacy.type && !legacy.legacyType)) return 'practice';
  const formulaAlias = FORMULA_TYPE_ALIASES.includes((legacy.type ?? legacy.legacyType ?? '').toLowerCase());
  if (legacy.type === 'formulaBreakdown' || formulaAlias || (section.formula?.cases?.length && !legacy.type && !legacy.legacyType)) return 'formulaBreakdown';
  const typeBreakdownAlias = TYPE_BREAKDOWN_ALIASES.includes((legacy.type ?? legacy.legacyType ?? '').toLowerCase());
  if (legacy.type === 'typeBreakdown' || typeBreakdownAlias || (section.typeBreakdown?.cases?.length && !legacy.type && !legacy.legacyType)) return 'typeBreakdown';
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
  // สถานะรายส่วน: เก็บเฉพาะค่าที่รู้จัก — ค่าอื่นถือว่า "เผยแพร่" เพื่อไม่ให้เนื้อหาเดิมหายจากผู้เรียน
  const visibility = section.visibility === 'draft' ? 'draft' as const
    : section.visibility === 'published' ? 'published' as const
      : undefined;
  const normalized: LessonSection = {
    visibility,
    type: undefined,
    legacyType: legacyType === 'rule' || legacyType === 'detailedRule' || legacyType === 'importantNote' || legacyType === 'practice' || legacyType === 'formulaBreakdown' || legacyType === 'typeBreakdown' ? undefined : legacyType,
    heading: typeof section.heading === 'string' ? section.heading : undefined,
    body: typeof section.body === 'string' ? section.body : undefined,
    chip: typeof section.chip === 'string' ? section.chip : undefined,
    description: typeof section.description === 'string' ? section.description : undefined,
    rows,
    examples,
    practice: questions.length ? { questions } : undefined,
    quizHeading: typeof section.quizHeading === 'string' ? section.quizHeading : undefined,
    formula: normalizeFormula(section.formula),
    typeBreakdown: normalizeTypeBreakdown(section.typeBreakdown),
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

/**
 * "เนื้อหาชิ้นนี้มีอะไรให้แสดงจริงไหม" — ใช้ร่วมกันทั้งตอนบันทึก (POST/PATCH) และ
 * ตอนนำเข้าไฟล์ JSON (import) เพื่อไม่ให้กฎต่างกันคนละที่
 *
 * นับเฉพาะฟิลด์ที่ตัวเรนเดอร์ใช้จริง: การ์ดที่มีแต่เคสของ Core Formula breakdown
 * หรือ Type Breakdown (ไม่มี heading/body) ก็ต้องถือว่ามีเนื้อหา ไม่งั้นจะบันทึกไม่ได้
 * ทั้งที่หน้าจอแสดงผลครบ
 */
export function lessonSectionsHaveContent(sections: LessonSection[]): boolean {
  return sections.some((section) => Boolean(
    section.heading?.trim() ||
    section.body?.trim() ||
    section.chip?.trim() ||
    section.description?.trim() ||
    section.rows?.some((row) => row.left.trim() || row.right?.trim()) ||
    section.examples?.some((example) => example.en.trim()) ||
    // Core Formula breakdown (Figma 419:56249) — เรนเดอร์เมื่อมีเคสอย่างน้อย 1 เคส
    section.formula?.cases?.length ||
    // Type Breakdown (Figma 419:56446) — เรนเดอร์เมื่อมีเคสอย่างน้อย 1 เคส
    section.typeBreakdown?.cases?.length ||
    section.practice?.questions?.some((question) => question.sentence.trim()),
  ));
}
