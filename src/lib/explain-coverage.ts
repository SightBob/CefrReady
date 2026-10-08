/**
 * ตรวจว่าเนื้อหา Explain ครอบคลุมข้อสอบในหัวข้อเดียวกันครบหรือไม่
 *
 * ปัญหาที่โมดูลนี้แก้: หัวข้ออย่าง "Auxiliaries & Verb Forms" มีข้อสอบ 6 ข้อที่ถาม
 * คนละประเด็น (do-support, so/neither, have got, subjunctive) แต่บทที่เขียนไว้อาจ
 * อธิบายแค่ do/does/did — ผู้เรียนกด "โหมดทบทวน" แล้วไม่เจอสิ่งที่ข้อตัวเองถาม
 * และไม่มีใครรู้จนกว่าจะมีคนไปเจอเอง
 *
 * หน่วยที่ใช้เทียบคือ "หัวข้อย่อย" ของข้อ (`questions.sub_topic_grammar`) กับป้าย
 * ที่บทใช้จริง (`chip` ของ section ก่อน ถ้าไม่มีจึงใช้ `heading`) การเทียบนี้ใช้กับ
 * การเตือนในหน้าแอดมินเท่านั้น — คีย์จริงของ DB (`test_explains.grammar_topic`)
 * ยังเทียบแบบ trim ตรงเป๊ะเหมือนเดิม
 */

/** ข้อสอบหนึ่งข้อเท่าที่ต้องใช้ตัดสินความครอบคลุม */
export interface CoverageQuestion {
  id: number;
  questionText: string;
  /** ค่าจาก `questions.sub_topic_grammar` — ว่าง = ยังไม่ระบุหัวข้อย่อย */
  subTopicGrammar?: string | null;
}

/**
 * เฉพาะฟิลด์ที่ใช้ตัดสินความครอบคลุม — รับได้ทั้ง section ที่บันทึกแล้วและ draft
 * ในหน้าแก้ไข (ค่าจึงเป็น unknown แล้วค่อยตรวจชนิดตอนใช้)
 */
export interface CoverageSection {
  chip?: unknown;
  heading?: unknown;
}

export type CoverageQuestionState =
  /** หัวข้อย่อยของข้อตรงกับหัวข้อย่อยที่บทอธิบาย */
  | 'covered'
  /** ข้อมีหัวข้อย่อย แต่บทไม่ได้อธิบายหัวข้อนั้น */
  | 'missing'
  /** ข้อยังไม่ระบุหัวข้อย่อย — ตรวจสอบให้ไม่ได้ */
  | 'untagged';

export interface CoverageQuestionRow {
  id: number;
  questionText: string;
  subTopic: string;
  state: CoverageQuestionState;
}

export interface MissingSubTopic {
  label: string;
  questionCount: number;
}

export type CoverageState =
  /** หัวข้อนี้ยังไม่มีข้อสอบใช้ */
  | 'empty-topic'
  /** ข้อไม่มีหัวข้อย่อยเลย → เทียบกับบทไม่ได้ */
  | 'unverifiable'
  /** ครอบคลุมบางส่วน (ขาดหัวข้อย่อย หรือมีข้อยังไม่ระบุหัวข้อย่อย) */
  | 'partial'
  /** ครบทุกข้อที่มีหัวข้อย่อย */
  | 'covered';

export interface ExplainCoverage {
  total: number;
  covered: number;
  missing: number;
  untagged: number;
  state: CoverageState;
  /** ป้ายหัวข้อย่อยที่บทนี้พูดถึง ตามลำดับที่ปรากฏในบท */
  lessonLabels: string[];
  /** หัวข้อย่อยที่มีข้อสอบใช้แต่บทไม่ได้อธิบาย (มากไปน้อย) */
  missingSubTopics: MissingSubTopic[];
  questions: CoverageQuestionRow[];
}

/**
 * เทียบชื่อหัวข้อย่อยแบบหลวม: ตัดช่องว่างซ้ำ/หัวท้าย และไม่แยกตัวพิมพ์
 * (ต่างจาก `normalizeTopic()` ที่ใช้กับคีย์ DB ซึ่ง trim เท่านั้นและต้องตรงเป๊ะ)
 */
function normalizeLabel(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function readLabel(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** ป้ายหัวข้อย่อยของบท — `chip` ก่อน ถ้าไม่มีจึงใช้ `heading` แล้วตัดตัวซ้ำออก */
export function lessonCoverageLabels(sections: readonly CoverageSection[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const section of sections ?? []) {
    const label = readLabel(section?.chip) || readLabel(section?.heading);
    if (!label) continue;
    const key = normalizeLabel(label);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

/** ตรวจความครอบคลุมของบทหนึ่งอัน เทียบกับข้อสอบของหัวข้อที่ผูกไว้ */
export function explainCoverage(
  questions: readonly CoverageQuestion[],
  sections: readonly CoverageSection[],
): ExplainCoverage {
  const lessonLabels = lessonCoverageLabels(sections);
  const labelKeys = new Set(lessonLabels.map(normalizeLabel));

  const rows: CoverageQuestionRow[] = (questions ?? []).map((question) => {
    const subTopic = readLabel(question.subTopicGrammar);
    const state: CoverageQuestionState = !subTopic
      ? 'untagged'
      : labelKeys.has(normalizeLabel(subTopic))
        ? 'covered'
        : 'missing';
    return { id: question.id, questionText: question.questionText, subTopic, state };
  });

  const covered = rows.filter((row) => row.state === 'covered').length;
  const missingRows = rows.filter((row) => row.state === 'missing');
  const untagged = rows.filter((row) => row.state === 'untagged').length;

  // จัดกลุ่มหัวข้อย่อยที่ขาด — แสดงชื่อที่แอดมินพิมพ์ไว้ (ตัวแรกที่เจอ)
  const missingMap = new Map<string, MissingSubTopic>();
  for (const row of missingRows) {
    const key = normalizeLabel(row.subTopic);
    const found = missingMap.get(key);
    if (found) found.questionCount += 1;
    else missingMap.set(key, { label: row.subTopic, questionCount: 1 });
  }
  const missingSubTopics = [...missingMap.values()].sort(
    (a, b) => b.questionCount - a.questionCount || a.label.localeCompare(b.label),
  );

  const state: CoverageState =
    rows.length === 0
      ? 'empty-topic'
      : missingRows.length === 0 && untagged === 0
        ? 'covered'
        : covered === 0 && missingRows.length === 0
          ? 'unverifiable'
          : 'partial';

  return {
    total: rows.length,
    covered,
    missing: missingRows.length,
    untagged,
    state,
    lessonLabels,
    missingSubTopics,
    questions: rows,
  };
}

/** ข้อความสรุปสั้น ๆ ใต้หัวข้อการ์ด */
export function explainCoverageSummary(coverage: ExplainCoverage): string {
  switch (coverage.state) {
    case 'empty-topic':
      return 'หัวข้อนี้ยังไม่มีข้อสอบใช้';
    case 'unverifiable':
      return `ข้อในหัวข้อนี้ ${coverage.total} ข้อยังไม่ระบุหัวข้อย่อย — ยังตรวจความครอบคลุมไม่ได้`;
    case 'covered':
      return `ครอบคลุมครบ ${coverage.total} ข้อ (เทียบกับหัวข้อย่อยที่ระบุไว้)`;
    case 'partial': {
      const parts = [`ครอบคลุม ${coverage.covered}/${coverage.total} ข้อ`];
      if (coverage.missing > 0) parts.push(`ขาด ${coverage.missing} ข้อ`);
      if (coverage.untagged > 0) parts.push(`ยังไม่ระบุหัวข้อย่อย ${coverage.untagged} ข้อ`);
      return parts.join(' · ');
    }
  }
}

/**
 * ข้อความเตือนเมื่อเนื้อหาอาจไม่ครบ (null = ไม่มีอะไรต้องเตือน)
 * ใช้เตือนเท่านั้น ไม่ได้เอาไปกั้นการเผยแพร่
 */
export function explainCoverageWarning(coverage: ExplainCoverage): string | null {
  if (coverage.state === 'empty-topic' || coverage.state === 'covered') return null;
  if (coverage.state === 'unverifiable') {
    return `ยังตรวจความครอบคลุมไม่ได้: ข้อในหัวข้อนี้ยังไม่ระบุหัวข้อย่อย (${coverage.total} ข้อ)`;
  }
  const missing = coverage.missingSubTopics
    .map((item) => `${item.label} (${item.questionCount} ข้อ)`)
    .join(', ');
  const parts: string[] = [];
  if (missing) parts.push(`ยังไม่มีหัวข้อย่อย: ${missing}`);
  if (coverage.untagged > 0) parts.push(`ข้อยังไม่ระบุหัวข้อย่อย ${coverage.untagged} ข้อ`);
  return `บทนี้อาจอธิบายไม่ครบทุกข้อ — ${parts.join(' · ')}`;
}
