'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Loader2, Check, X, FileText, HelpCircle,
  ChevronUp, ChevronDown, Sparkles, AlertTriangle, Upload,
  History, RotateCcw, MousePointerClick, Highlighter,
} from 'lucide-react';
import { normalizeLessonSection, type LessonSection } from '@/lib/lesson-sections';

// ============================================================
// Types (mirror lesson_pages JSONB shapes)
// ============================================================

interface ExampleRow {
  en: string;
  th: string;
  ok: boolean;
}

/** Tap & Select — ฝึกแยกถูก/ผิด: each item has its own prompt + 2 editable choices */
interface TapItem {
  prompt: string;          // ประโยค/คำถามที่แสดง เช่น "She work at a bank."
  choiceA: string;         // ตัวเลือกที่ 1 — เช่น "ถูก"
  choiceB: string;         // ตัวเลือกที่ 2 — เช่น "ผิด"
  correct: 0 | 1;          // 0 = choiceA ถูก, 1 = choiceB ถูก
}

interface TapExercise {
  title: string;           // เช่น "แตะเลือกว่าประโยคนี้ถูกหรือผิด"
  items: TapItem[];        // โจทย์แต่ละข้อ
}

/** One pattern row inside a review topic (UI Reference) */
interface RowDraft {
  left: string;
  right: string;
}

type SectionType = NonNullable<LessonSection['type']>;

interface SectionRow {
  type: SectionType;
  heading: string;
  body: string;
  chip: string;
  description: string;
  rows: RowDraft[];
  examples: ExampleRow[];
  practice: QuizRow[];
  tip: string;
  tap: TapExercise | null;
}

interface QuizRow {
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

function toQuizRows(value: PageData['quiz']): QuizRow[] {
  if (!value) return [{ sentence: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }];
  if (Array.isArray((value as { questions?: unknown }).questions)) {
    return (value as { questions: QuizRow[] }).questions.map((q) => ({
      sentence: q.sentence ?? '',
      options: q.options ?? ['', '', '', ''],
      answerIndex: q.answerIndex ?? 0,
      explanation: q.explanation ?? '',
    }));
  }
  const legacy = value as QuizRow;
  return [{
    sentence: legacy.sentence ?? '',
    options: legacy.options ?? ['', '', '', ''],
    answerIndex: legacy.answerIndex ?? 0,
    explanation: legacy.explanation ?? '',
  }];
}

/** คลังศัพท์ช่วยชีวิต — flexible columns + rows */
interface VocabBankRow {
  cells: string[];
}

interface VocabBankDraft {
  columns: string[];
  rows: VocabBankRow[];
}

const DEFAULT_VOCAB: VocabBankDraft = {
  columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
  rows: [],
};

/** Accepts legacy VocabRow[] or the new { columns, rows } shape from the API */
function toVocabDraft(value: PageData['vocabBank']): VocabBankDraft {
  if (Array.isArray(value)) {
    return {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: value.map((r) => ({
        cells: [
          (r as { subject?: string }).subject ?? '',
          (r as { verbForm?: string }).verbForm ?? '',
          (r as { example?: string }).example ?? '',
        ],
      })),
    };
  }
  if (value && typeof value === 'object' && Array.isArray(value.columns)) {
    const cols = value.columns;
    return {
      columns: [...cols],
      rows: (value.rows ?? []).map((r) => ({
        cells: cols.map((_, i) => r[i] ?? ''),
      })),
    };
  }
  return { ...DEFAULT_VOCAB, rows: [] };
}

interface PageData {
  id: number;
  nodeId: number;
  pageType: string;
  sections: LessonSection[];
  quiz:
    | { sentence: string; options: string[]; answerIndex: number; explanation: string }
    | { questions: QuizRow[] }
    | null;
  vocabBank:
    | Array<{ subject?: string; verbForm?: string; example?: string }>
    | { columns: string[]; rows: string[][] }
    | null;
  tip: string | null;
  intro: string | null;
  isPublished: boolean;
  orderIndex: number;
}

const emptySection = (type: SectionType = 'rule'): SectionRow => ({
  type,
  heading: '',
  body: '',
  chip: '',
  description: '',
  rows: [],
  examples: [],
  practice: [{ sentence: '', options: ['', '', ''], answerIndex: 0, explanation: '' }],
  tip: '',
  tap: null,
});
const emptyRow = (): RowDraft => ({ left: '', right: '' });
const emptyExample = (): ExampleRow => ({ en: '', th: '', ok: true });

function inferSectionType(section: Partial<SectionRow> | Partial<LessonSection>): SectionType {
  return normalizeLessonSection(section).type ?? 'detailedRule';
}

function sectionHasContent(section: SectionRow): boolean {
  switch (section.type) {
    case 'rule':
      return Boolean(section.heading.trim() || section.chip.trim() || section.description.trim() || section.examples.some((example) => example.en.trim() || example.th.trim()) || section.rows.some((row) => row.left.trim() || row.right.trim()) || section.tip.trim());
    case 'detailedRule':
      return Boolean(section.heading.trim() || section.chip.trim() || section.description.trim() || section.body.trim() || section.rows.some((row) => row.left.trim() || row.right.trim()) || section.tip.trim() || section.examples.some((example) => example.en.trim() || example.th.trim()));
    case 'importantNote':
      return Boolean(section.heading.trim() || section.body.trim() || section.tip.trim());
    case 'practice':
      return section.practice.some((question) => question.sentence.trim());
  }
}

function sectionToPayload(section: SectionRow) {
  const payload: Record<string, unknown> = { type: section.type };
  if (section.heading.trim()) payload.heading = section.heading.trim();
  if (section.body.trim()) payload.body = section.body.trim();
  if (section.type === 'rule' || section.type === 'detailedRule') {
    if (section.chip.trim()) payload.chip = section.chip.trim();
    if (section.description.trim()) payload.description = section.description.trim();
    if (section.body.trim()) payload.body = section.body.trim();
    if (section.tip.trim()) payload.tip = section.tip.trim();
    const rows = section.rows.filter((row) => row.left.trim() || row.right.trim());
    if (rows.length) payload.rows = rows.map((row) => ({ left: row.left.trim(), right: row.right.trim() || undefined }));
    const examples = section.examples.filter((example) => example.en.trim() || example.th.trim());
    if (examples.length) payload.examples = examples.map((example) => ({ en: example.en.trim(), th: example.th.trim() || undefined, ok: example.ok }));
  }
  if (section.type === 'importantNote' && section.body.trim()) payload.body = section.body.trim();
  if (section.type === 'practice') {
    const questions = section.practice.filter((question) => question.sentence.trim()).map((question) => ({
      sentence: question.sentence.trim(),
      options: question.options.map((option) => option.trim()).filter(Boolean),
      answerIndex: question.options.slice(0, question.answerIndex).filter((option) => option.trim()).length,
      explanation: question.explanation.trim() || undefined,
    }));
    if (questions.length) payload.practice = { questions };
  }
  return payload;
}
const emptyTapItem = (): TapItem => ({ prompt: '', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 });

function toSectionDraft(value: LessonSection): SectionRow {
  const normalized = normalizeLessonSection(value);
  const type = inferSectionType({ ...normalized, rows: normalized.rows?.map((row) => ({ left: row.left, right: row.right ?? '' })) });
  return {
    ...emptySection(type),
    ...normalized,
    type,
    heading: normalized.heading ?? '',
    body: normalized.body ?? '',
    chip: normalized.chip ?? '',
    description: normalized.description ?? '',
    rows: (normalized.rows ?? []).map((row) => ({ left: row.left ?? '', right: row.right ?? '' })),
    practice: normalized.practice?.questions?.length ? normalized.practice.questions.map((question) => ({
      sentence: question.sentence ?? '',
      options: question.options?.length ? [...question.options] : ['', '', ''],
      answerIndex: question.answerIndex ?? 0,
      explanation: question.explanation ?? '',
    })) : [{ sentence: '', options: ['', '', ''], answerIndex: 0, explanation: '' }],
    tip: normalized.tip ?? '',
    examples: (normalized.examples ?? []).map((example) => ({ en: example.en ?? '', th: example.th ?? '', ok: example.ok ?? true })),
    tap: normalized.tap ?? null,
  };
}

function initialSections(initial: PageData | null): SectionRow[] {
  const sections = initial?.sections?.length ? initial.sections.map(toSectionDraft) : [
    initial?.pageType === 'tap'
      ? { ...emptySection('detailedRule'), tap: { title: 'แตะเลือกว่าประโยคนี้ถูกหรือผิด', items: [emptyTapItem()] } }
      : emptySection(),
  ];
  if (initial?.pageType !== 'explain') return sections;

  const intro = initial.intro?.trim();
  if (intro && !sections.some((section) => section.body.trim() === intro)) {
    sections.push({ ...emptySection('detailedRule'), heading: 'บทนำ', body: intro });
  }

  const tip = initial.tip?.trim();
  if (tip && !sections.some((section) => section.body.trim() === tip || section.tip.trim() === tip)) {
    sections.push({ ...emptySection('importantNote'), heading: 'จุดสำคัญที่ควรจำ', body: tip });
  }
  return sections;
}

/**
 * Parse pasted CSV / TSV / semicolon text into a table.
 * First non-empty line = headers. Supports simple double-quote escaping.
 */
export function parseTableText(raw: string): { headers: string[]; rows: string[][] } | null {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null; // ต้องมีแถวหัวคอลัมน์ + อย่างน้อย 1 แถวข้อมูล

  const detectDelim = (line: string): string => {
    if (line.includes('\t')) return '\t';
    if (line.includes(',')) return ',';
    if (line.includes(';')) return ';';
    return '\t';
  };

  const parseLine = (line: string, delim: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const delim = detectDelim(lines[0]);
  const headers = parseLine(lines[0], delim);
  const width = headers.length;
  if (width < 1 || !headers.some((h) => h)) return null;
  const rows = lines.slice(1).map((l) => {
    const cells = parseLine(l, delim);
    while (cells.length < width) cells.push('');
    return cells.slice(0, width);
  });
  if (rows.length === 0) return null;
  return { headers, rows };
}

/** Wrap the current textarea selection in the given markup, return the new value + caret pos */
function wrapSelection(
  el: HTMLTextAreaElement | HTMLInputElement,
  marker: string
): { value: string; caret: number } {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const sel = el.value.slice(start, end);
  const wrapped = `${marker}${sel || 'ข้อความ'}${marker}`;
  const newValue = el.value.slice(0, start) + wrapped + el.value.slice(end);
  return { value: newValue, caret: start + wrapped.length };
}

// ============================================================
// LessonPageEditor
// ============================================================

export default function LessonPageEditor({
  pageId,
  initial,
}: {
  pageId: number | null; // null = create mode (POST to /api/admin/nodes/[nodeId]/pages)
  initial: PageData | null;
}) {
  const router = useRouter();
  const [pageType, setPageType] = useState<'explain' | 'quiz' | 'tap'>(
    initial?.pageType === 'quiz' ? 'quiz' : initial?.pageType === 'tap' ? 'tap' : 'explain'
  );

  /** Switch page type. A 'tap' page stores its exercise in sections[0].tap;
   *  switching away clears it so tap data never leaks into explain pages. */
  const switchPageType = (next: 'explain' | 'quiz' | 'tap') => {
    setPageType(next);
    setSections((s) =>
      s.map((sec, idx) => {
        if (next === 'tap') {
          return idx === 0 && !sec.tap
            ? { ...sec, tap: { title: 'แตะเลือกว่าประโยคนี้ถูกหรือผิด', items: [emptyTapItem()] } }
            : sec;
        }
        return sec.tap ? { ...sec, tap: null } : sec;
      })
    );
  };
  const [sections, setSections] = useState<SectionRow[]>(() => initialSections(initial));

  const [quiz, setQuiz] = useState<QuizRow[]>(() => toQuizRows(initial?.quiz ?? null));
  const [vocab, setVocab] = useState<VocabBankDraft>(() => toVocabDraft(initial?.vocabBank ?? null));
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [saving, setSaving] = useState(false);
  const [vocabImportOpen, setVocabImportOpen] = useState(false);
  const [vocabImportText, setVocabImportText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: number; version: number; changeType: string; changedBy: string | null; createdAt: string }>>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  // ---------- Sections ----------
  // Wrap the current selection of a textarea/input with ==highlight== markers
  // (or remove existing markers around the selection). Usage: select text in
  // the field, then click the highlight button.
  const toggleHighlight = (element: HTMLTextAreaElement | HTMLInputElement, onChange: (value: string) => void) => {
    const { selectionStart, selectionEnd, value } = element;
    if (selectionStart === null || selectionEnd === null) return;
    const selected = value.slice(selectionStart, selectionEnd);
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    if (!selected) {
      toast.info('คลุมข้อความที่ต้องการไฮไลต์ก่อน แล้วกดปุ่มอีกครั้ง');
      return;
    }
    // Already wrapped → unwrap
    if (selected.startsWith('==') && selected.endsWith('==') && selected.length > 4) {
      onChange(before + selected.slice(2, -2) + after);
      requestAnimationFrame(() => {
        element.focus();
        element.setSelectionRange(selectionStart, selectionEnd - 4);
      });
      return;
    }
    if (before.endsWith('==') && after.startsWith('==')) {
      onChange(before.slice(0, -2) + selected + after.slice(2));
      requestAnimationFrame(() => {
        element.focus();
        element.setSelectionRange(selectionStart - 2, selectionEnd - 2);
      });
      return;
    }
    // Wrap: avoid nested markers if the text already contains ==
    const cleaned = selected.replace(/==/g, '');
    onChange(`${before}==${cleaned}==${after}`);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(selectionStart + 2, selectionStart + 2 + cleaned.length);
    });
  };

  // Small toolbar button placed under a text field that supports ==highlight==.
  // Finds the field by its data-highlight-field id, wraps/ unwraps the selection.
  // Small toolbar button placed under a text field that supports ==highlight==.
  // Finds the field by its data-highlight-field id, wraps/ unwraps the selection.
  const HighlightFieldToggle = ({ fieldKey, onApply }: { fieldKey: string; onApply: (el: HTMLTextAreaElement | HTMLInputElement) => void }) => (
    <button
      type="button"
      onClick={() => {
        const el = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`[data-highlight-field="${fieldKey}"]`);
        if (el) onApply(el);
      }}
      title="คลุมข้อความแล้วกดเพื่อไฮไลต์ด้วย ==...=="
      className="inline-flex items-center gap-1 self-end rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors"
    >
      <Highlighter className="w-3 h-3" /> ไฮไลต์
    </button>
  );

  const updateSection = (i: number, patch: Partial<SectionRow>) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));

  const addSection = (type: SectionType = 'rule') => setSections((s) => [...s, emptySection(type)]);
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));
  const addExample = (si: number) => setSections((s) => s.map((section, i) => i === si ? { ...section, examples: [...section.examples, emptyExample()] } : section));
  const updateExample = (si: number, ei: number, patch: Partial<ExampleRow>) => setSections((s) => s.map((section, i) => i === si ? { ...section, examples: section.examples.map((example, j) => j === ei ? { ...example, ...patch } : example) } : section));
  const removeExample = (si: number, ei: number) => setSections((s) => s.map((section, i) => i === si ? { ...section, examples: section.examples.filter((_, j) => j !== ei) } : section));
  const updatePractice = (si: number, qi: number, patch: Partial<QuizRow>) => setSections((s) => s.map((section, i) => i === si ? { ...section, practice: section.practice.map((question, j) => j === qi ? { ...question, ...patch } : question) } : section));
  const updatePracticeOption = (si: number, qi: number, oi: number, value: string) => setSections((s) => s.map((section, i) => i === si ? { ...section, practice: section.practice.map((question, j) => j === qi ? { ...question, options: question.options.map((option, k) => k === oi ? value : option) } : question) } : section));
  const addPracticeOption = (si: number, qi: number) => setSections((s) => s.map((section, i) => i === si ? { ...section, practice: section.practice.map((question, j) => j === qi ? { ...question, options: [...question.options, ''] } : question) } : section));
  const removePracticeOption = (si: number, qi: number, oi: number) => setSections((s) => s.map((section, i) => i === si ? { ...section, practice: section.practice.map((question, j) => {
    if (j !== qi || question.options.length <= 2) return question;
    const options = question.options.filter((_, k) => k !== oi);
    return { ...question, options, answerIndex: Math.min(question.answerIndex, options.length - 1) };
  }) } : section));
  const addPracticeQuestion = (si: number) => setSections((s) => s.map((section, i) => i === si ? { ...section, practice: [...section.practice, { sentence: '', options: ['', '', ''], answerIndex: 0, explanation: '' }] } : section));
  const removePracticeQuestion = (si: number, qi: number) => setSections((s) => s.map((section, i) => i === si && section.practice.length > 1 ? { ...section, practice: section.practice.filter((_, j) => j !== qi) } : section));
  const movePracticeQuestion = (si: number, qi: number, direction: 'up' | 'down') => setSections((sections) => sections.map((section, index) => {
    if (index !== si) return section;
    const target = direction === 'up' ? qi - 1 : qi + 1;
    if (target < 0 || target >= section.practice.length) return section;
    const questions = [...section.practice];
    [questions[qi], questions[target]] = [questions[target], questions[qi]];
    return { ...section, practice: questions };
  }));
  const moveSection = (i: number, dir: 'up' | 'down') =>
    setSections((s) => {
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  // ---------- Review rows within a section (UI Reference) ----------
  const updateRow = (si: number, ri: number, patch: Partial<RowDraft>) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si
          ? { ...sec, rows: sec.rows.map((row, i2) => (i2 === ri ? { ...row, ...patch } : row)) }
          : sec
      )
    );

  const addRow = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) => (idx === si ? { ...sec, rows: [...sec.rows, emptyRow()] } : sec))
    );

  const removeRow = (si: number, ri: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si ? { ...sec, rows: sec.rows.filter((_, i2) => i2 !== ri) } : sec
      )
    );

  const moveRow = (si: number, ri: number, dir: 'up' | 'down') =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si) return sec;
        const j = dir === 'up' ? ri - 1 : ri + 1;
        if (j < 0 || j >= sec.rows.length) return sec;
        const rows = [...sec.rows];
        [rows[ri], rows[j]] = [rows[j], rows[ri]];
        return { ...sec, rows };
      })
    );

  // ---------- Vocab bank (flexible columns) ----------
  const openVocabImport = () => {
    setVocabImportText('');
    setVocabImportOpen(true);
  };

  const applyVocabImport = () => {
    const parsed = parseTableText(vocabImportText);
    if (!parsed) {
      toast.error('อ่านข้อมูลไม่สำเร็จ — ต้องมีแถวหัวคอลัมน์ + อย่างน้อย 1 แถวข้อมูล');
      return;
    }
    if (parsed.headers.length < 2) {
      toast.error('คลังศัพท์ต้องมีอย่างน้อย 2 คอลัมน์');
      return;
    }
    if (parsed.headers.length > 8) {
      toast.error('คลังศัพท์รองรับสูงสุด 8 คอลัมน์');
      return;
    }
    setVocab({
      columns: parsed.headers,
      rows: parsed.rows.map((r) => ({ cells: r })),
    });
    setVocabImportOpen(false);
    setVocabImportText('');
    toast.success(`นำเข้าคลังศัพท์สำเร็จ — ${parsed.headers.length} คอลัมน์, ${parsed.rows.length} แถว`);
  };

  const setVocabCell = (rowIdx: number, colIdx: number, value: string) =>
    setVocab((v) => ({
      ...v,
      rows: v.rows.map((row, ri) =>
        ri === rowIdx ? { cells: row.cells.map((c, ci) => (ci === colIdx ? value : c)) } : row
      ),
    }));

  const addVocabRow = () =>
    setVocab((v) => ({ ...v, rows: [...v.rows, { cells: v.columns.map(() => '') }] }));

  const removeVocabRow = (i: number) =>
    setVocab((v) => ({ ...v, rows: v.rows.filter((_, ri) => ri !== i) }));

  const renameVocabColumn = (i: number, value: string) =>
    setVocab((v) => ({ ...v, columns: v.columns.map((c, ci) => (ci === i ? value : c)) }));

  const addVocabColumn = () =>
    setVocab((v) => ({
      ...v,
      columns: [...v.columns, ''],
      rows: v.rows.map((row) => ({ cells: [...row.cells, ''] })),
    }));

  const removeVocabColumn = (i: number) =>
    setVocab((v) => {
      if (v.columns.length <= 2) return v; // keep at least 2 columns
      return {
        columns: v.columns.filter((_, ci) => ci !== i),
        rows: v.rows.map((row) => ({ cells: row.cells.filter((_, ci) => ci !== i) })),
      };
    });

  // ---------- Version history ----------
  const loadVersions = async () => {
    if (!pageId) return;
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/versions`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'โหลดประวัติไม่สำเร็จ');
      setVersions(json.data ?? []);
      setHistoryOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoadingVersions(false);
    }
  };

  const restoreVersion = async (versionId: number) => {
    if (!pageId || !confirm('กู้คืนเวอร์ชันนี้หรือไม่? ระบบจะบันทึกข้อมูลปัจจุบันเป็นเวอร์ชันใหม่ก่อนกู้คืน')) return;
    setRestoringVersion(versionId);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const detail = Array.isArray(json.issues) ? `: ${json.issues[0]?.message ?? ''}` : '';
        throw new Error(`${json.error ?? 'กู้คืนไม่สำเร็จ'}${detail}`);
      }
      toast.success(`กู้คืนเป็นเวอร์ชัน ${versions.find((v) => v.id === versionId)?.version ?? ''} แล้ว`);
      setHistoryOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'กู้คืนไม่สำเร็จ');
    } finally {
      setRestoringVersion(null);
    }
  };

  // ---------- Tap items within a section ----------
  const updateTap = (si: number, patch: Partial<TapExercise>) =>
    setSections((s) =>
      s.map((sec, idx) => (idx === si && sec.tap ? { ...sec, tap: { ...sec.tap, ...patch } } : sec))
    );

  const updateTapItem = (si: number, ii: number, patch: Partial<TapItem>) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si && sec.tap
          ? { ...sec, tap: { ...sec.tap, items: sec.tap.items.map((it, i2) => (i2 === ii ? { ...it, ...patch } : it)) } }
          : sec
      )
    );

  const removeTapItem = (si: number, ii: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si && sec.tap
          ? { ...sec, tap: { ...sec.tap, items: sec.tap.items.filter((_, i2) => i2 !== ii) } }
          : sec
      )
    );

  const addTapItem = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si && sec.tap ? { ...sec, tap: { ...sec.tap, items: [...sec.tap.items, emptyTapItem()] } } : sec
      )
    );

  // ---------- Quiz questions ----------
  const updateQuiz = (qi: number, patch: Partial<QuizRow>) =>
    setQuiz((q) => q.map((row, i) => (i === qi ? { ...row, ...patch } : row)));

  const addQuizQuestion = () =>
    setQuiz((q) => [...q, { sentence: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]);

  const removeQuizQuestion = (qi: number) =>
    setQuiz((q) => q.filter((_, i) => i !== qi));

  const updateQuizOption = (qi: number, oi: number, value: string) =>
    setQuiz((q) =>
      q.map((row, i) => (i === qi ? { ...row, options: row.options.map((o, j) => (j === oi ? value : o)) } : row))
    );

  const addOption = (qi: number) =>
    setQuiz((q) =>
      q.map((row, i) => (i === qi ? { ...row, options: [...row.options, ''] } : row))
    );

  const removeOption = (qi: number, oi: number) =>
    setQuiz((q) =>
      q.map((row, i) => {
        if (i !== qi || row.options.length <= 2) return row;
        const options = row.options.filter((_, j) => j !== oi);
        return { ...row, options, answerIndex: Math.min(row.answerIndex, options.length - 1) };
      })
    );

  // ---------- Save ----------
  const validationWarnings = pageType === 'explain'
    ? sections.flatMap((section, index) => {
        if (section.type !== 'practice') return [];
        if (!section.practice.some((question) => question.sentence.trim())) return [`Mini Quiz Section ${index + 1} ต้องมีโจทย์อย่างน้อย 1 ข้อ`];
        return section.practice.flatMap((question, questionIndex) => {
          if (!question.sentence.trim()) return [];
          if (question.options.filter((option) => option.trim()).length < 2) return [`Mini Quiz Section ${index + 1} ข้อ ${questionIndex + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`];
          if (!question.options[question.answerIndex]?.trim()) return [`Mini Quiz Section ${index + 1} ข้อ ${questionIndex + 1} ต้องกำหนดคำตอบที่ถูกต้อง`];
          return [];
        });
      })
    : pageType === 'tap'
    ? (() => {
        const warnings: string[] = [];
        const tap = sections[0]?.tap;
        if (!tap || tap.items.length === 0) {
          warnings.push('หน้า Tap & Select ยังไม่มีโจทย์');
        } else {
          tap.items.forEach((item, itemIndex) => {
            if (!item.prompt.trim() || !item.choiceA.trim() || !item.choiceB.trim()) {
              warnings.push(`Tap & Select ข้อที่ ${itemIndex + 1} ต้องมีโจทย์และตัวเลือก A/B ครบ`);
            }
          });
        }
        return warnings;
      })()
    : quiz.flatMap((question, questionIndex) => {
        const warnings: string[] = [];
        if (!question.sentence.trim()) warnings.push(`Real Exam ข้อที่ ${questionIndex + 1} ยังไม่มีโจทย์`);
        if (question.options.filter((option) => option.trim()).length < 2) warnings.push(`Real Exam ข้อที่ ${questionIndex + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`);
        if (!question.options[question.answerIndex]?.trim()) warnings.push(`Real Exam ข้อที่ ${questionIndex + 1} ยังไม่ได้กำหนดคำตอบ`);
        return warnings;
      });

  const handleSave = async () => {
    if (isPublished && validationWarnings.length > 0) {
      toast.error(`ยังเผยแพร่ไม่ได้: ${validationWarnings[0]}`);
      return;
    }

    // Validation
    if (pageType === 'explain') {
      const valid = sections.filter(sectionHasContent);
      if (valid.length === 0) {
        toast.error('ต้องมีอย่างน้อย 1 Section ที่มีเนื้อหา');
        return;
      }
      for (const s of valid) {
        for (const r of s.rows) {
          if (!r.left.trim() && r.right.trim()) {
            toast.error('แถวที่มีช่องขวา (ตัวอย่างสีเหลือง) ต้องมีช่องซ้ายด้วย');
            return;
          }
        }
        if (s.type === 'practice' && s.practice.some((question) => question.sentence.trim() && (question.options.filter((option) => option.trim()).length < 2 || !question.options[question.answerIndex]?.trim()))) {
          toast.error('Mini Quiz ทุกข้อที่มีโจทย์ต้องมีตัวเลือกอย่างน้อย 2 ข้อ และกำหนดคำตอบที่ถูกต้อง');
          return;
        }
      }
    } else if (pageType === 'tap') {
      const tap = sections[0]?.tap;
      if (!tap || tap.items.length === 0) {
        toast.error('หน้า Tap & Select ต้องมีอย่างน้อย 1 โจทย์');
        return;
      }
      for (const item of tap.items) {
        if (!item.prompt.trim() || !item.choiceA.trim() || !item.choiceB.trim()) {
          toast.error('ทุกโจทย์ต้องมีประโยคและตัวเลือก A/B ครบ');
          return;
        }
      }
    } else {
      if (quiz.length === 0) {
        toast.error('ต้องมีอย่างน้อย 1 ข้อสอบ');
        return;
      }
      for (const q of quiz) {
        if (!q.sentence.trim()) {
          toast.error('ทุกข้อสอบต้องมีโจทย์ประโยค');
          return;
        }
        if (q.options.filter((o) => o.trim()).length < 2) {
          toast.error('ทุกข้อสอบต้องมีอย่างน้อย 2 ตัวเลือก');
          return;
        }
        if (!q.options[q.answerIndex]?.trim()) {
          toast.error('คำตอบที่ถูกต้องต้องไม่ว่าง');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload =
        pageType === 'explain'
          ? {
              pageType,
              sections: sections.filter(sectionHasContent).map(sectionToPayload),
              vocabBank:
                vocab.rows.filter((r) => r.cells.some((c) => c.trim())).length > 0
                  ? {
                      columns: vocab.columns.map((c) => c.trim() || 'คอลัมน์'),
                      rows: vocab.rows
                        .filter((r) => r.cells.some((c) => c.trim()))
                        .map((r) => r.cells.map((c) => c.trim())),
                    }
                  : null,
              // These legacy page-level fields are migrated into editable Sections.
              tip: null,
              intro: null,
              isPublished,
            }
          : pageType === 'tap'
          ? {
              pageType,
              sections: [
                {
                  type: 'detailedRule',
                  heading: '',
                  body: '',
                  headingSize: 'md' as const,
                  bodySize: 'md' as const,
                  tap: {
                    title: (sections[0]?.tap?.title ?? '').trim() || 'แตะเลือกว่าประโยคนี้ถูกหรือผิด',
                    items: (sections[0]?.tap?.items ?? [])
                      .filter((it) => it.prompt.trim() && it.choiceA.trim() && it.choiceB.trim())
                      .map((it) => ({
                        prompt: it.prompt.trim(),
                        choiceA: it.choiceA.trim(),
                        choiceB: it.choiceB.trim(),
                        correct: it.correct,
                      })),
                  },
                },
              ],
              isPublished,
            }
          : {
              pageType,
              sections: [],
              quiz: {
                questions: quiz.map((q) => ({
                  sentence: q.sentence.trim(),
                  options: q.options.map((o) => o.trim()).filter(Boolean),
                  answerIndex: q.answerIndex,
                  explanation: q.explanation.trim(),
                })),
              },
              isPublished,
            };

      const res = pageId
        ? await fetch(`/api/admin/pages/${pageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/nodes/${initial?.nodeId}/pages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        toast.success(pageId ? 'บันทึกหน้าแล้ว' : 'สร้างหน้าแล้ว');
        router.push('/admin/units');
        router.refresh();
      } else {
        const j = await res.json().catch(() => null);
        const issues = Array.isArray(j?.issues)
          ? j.issues.filter((issue: { message?: unknown }) => typeof issue?.message === 'string')
          : [];
        const detail = issues[0]?.message;
        const remaining = issues.length > 1 ? ` (และอีก ${issues.length - 1} รายการ)` : '';
        toast.error(detail ? `${j?.error ?? 'บันทึกไม่สำเร็จ'}: ${detail}${remaining}` : j?.error ?? 'บันทึกไม่สำเร็จ');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/units" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> เส้นทางการเรียน
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {pageId && (
              <button
                onClick={loadVersions}
                disabled={loadingVersions}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-sky-300 hover:text-sky-700 text-slate-600 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {loadingVersions ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                ประวัติการแก้ไข
              </button>
            )}
            <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {pageId ? 'บันทึก' : 'สร้างหน้า'}
            </button>
          </div>
        </div>

        {/* Validation checklist */}
        {validationWarnings.length > 0 && (
          <div className="mb-5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-amber-800">ตรวจพบจุดที่ควรแก้ก่อนเผยแพร่</p>
                <ul className="mt-1.5 space-y-1 text-xs font-semibold text-amber-700">
                  {validationWarnings.slice(0, 5).map((warning) => <li key={warning}>• {warning}</li>)}
                </ul>
                {validationWarnings.length > 5 && <p className="mt-1 text-xs text-amber-600">และอีก {validationWarnings.length - 5} รายการ</p>}
                <p className="mt-2 text-[11px] text-amber-600">บันทึกเป็นฉบับร่างได้ แต่ต้องแก้รายการเหล่านี้ก่อนกดเผยแพร่</p>
              </div>
            </div>
          </div>
        )}

        {/* Page type switch */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublished((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold border-2 ${isPublished ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
          >
            {isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
          </button>
          {initial && initial.nodeId > 0 && (
            <Link href={`/units/${initial.nodeId}`} target="_blank" className="text-sm font-semibold text-sky-600 hover:underline">
              ดูตัวอย่างหน้าผู้เรียน ↗
            </Link>
          )}
          <span className="text-sm font-semibold text-slate-600">ประเภทหน้า:</span>
          <div className="flex gap-2">            <button
              onClick={() => switchPageType('explain')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${pageType === 'explain' ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4" /> เนื้อหาอธิบาย
            </button>
            <button
              onClick={() => switchPageType('quiz')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${pageType === 'quiz' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
            >
              <HelpCircle className="w-4 h-4" /> คำถาม (Quiz)
            </button>
            <button
              onClick={() => switchPageType('tap')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${pageType === 'tap' ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
            >
              <MousePointerClick className="w-4 h-4" /> Tap & Select
            </button>
          </div>
        </div>

        {/* ============ EXPLAIN PAGE ============ */}
        {pageType === 'explain' && (
          <div className="space-y-4">
            {sections.map((section, si) => (
              <div key={si} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm ring-1 ring-slate-100 p-5">
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 place-items-center rounded-lg bg-sky-50 text-[11px] font-black text-sky-600">{si + 1}</span>
                    <select
                      aria-label={`รูปแบบ Section ${si + 1}`}
                      value={section.type}
                      onChange={(event) => updateSection(si, { type: event.target.value as SectionType })}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      <option value="rule">Rule / Grammar Card</option>
                      <option value="detailedRule">Rule / Grammar แบบละเอียด</option>
                      <option value="importantNote">Important Note / Key Point</option>
                      <option value="practice">Mini Quiz / Practice</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
                    <button onClick={() => moveSection(si, 'up')} disabled={si === 0} aria-label="เลื่อน Section ขึ้น" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => moveSection(si, 'down')} disabled={si === sections.length - 1} aria-label="เลื่อน Section ลง" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => removeSection(si)} disabled={sections.length === 1} aria-label="ลบ Section" className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-white disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-3">                  <input
                    type="text"
                    placeholder={section.type === 'importantNote' ? 'หัวข้อ เช่น ทริคสำคัญ' : section.type === 'practice' ? 'Header เช่น ลองทำโจทย์เพื่อทบทวนความเข้าใจ' : 'Header ของ Card (ไม่บังคับ)'}
                    value={section.heading}
                    onChange={(event) => updateSection(si, { heading: event.target.value })}
                    data-highlight-field={`${si}-heading`}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  {(section.type === 'rule' || section.type === 'importantNote') && <HighlightFieldToggle fieldKey={`${si}-heading`} onApply={(el) => toggleHighlight(el, (value) => updateSection(si, { heading: value }))} />}

                  {(section.type === 'detailedRule' || section.type === 'importantNote') && (
                    <div className="space-y-1">
                    <textarea
                      placeholder={section.type === 'importantNote' ? 'สรุปจุดสำคัญ รองรับ **ตัวหนา** / ==ไฮไลต์คำสำคัญ==' : 'คำอธิบายหลักการ รองรับ **ตัวหนา** / ==ไฮไลต์=='}
                      value={section.body}
                      onChange={(event) => updateSection(si, { body: event.target.value })}
                      rows={section.type === 'importantNote' ? 2 : 3}
                      className={`w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${section.type === 'importantNote' ? 'border-amber-200 bg-amber-50/50 focus:ring-amber-400' : 'border-slate-200 focus:ring-sky-400'}`}
                      data-highlight-field={`${si}-body`}
                    />
                    <HighlightFieldToggle fieldKey={`${si}-body`} onApply={(el) => toggleHighlight(el, (value) => updateSection(si, { body: value }))} />
                    </div>
                  )}

                  {(section.type === 'rule' || section.type === 'detailedRule') && (
                    <>
                      {section.type === 'rule' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex flex-col gap-1">
                          <input type="text" placeholder="ป้ายกฎ เช่น Does / Did" value={section.chip} onChange={(event) => updateSection(si, { chip: event.target.value })} data-highlight-field={`${si}-chip`} className="sm:w-56 shrink-0 rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400" />
                          <HighlightFieldToggle fieldKey={`${si}-chip`} onApply={(el) => toggleHighlight(el, (value) => updateSection(si, { chip: value }))} />
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                          <input type="text" placeholder="อธิบายกฎสั้น ๆ ข้างป้าย" value={section.description} onChange={(event) => updateSection(si, { description: event.target.value })} data-highlight-field={`${si}-desc`} className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400" />
                          <HighlightFieldToggle fieldKey={`${si}-desc`} onApply={(el) => toggleHighlight(el, (value) => updateSection(si, { description: value }))} />
                          </div>
                        </div>
                      )}
                      {section.type === 'detailedRule' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input type="text" placeholder="ป้ายหลักการ เช่น Did" value={section.chip} onChange={(event) => updateSection(si, { chip: event.target.value })} className="w-40 rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-sm font-bold" />
                            <input type="text" placeholder="คำอธิบายหลักการหลายขั้นตอน" value={section.description} onChange={(event) => updateSection(si, { description: event.target.value })} className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                          </div>
                          <textarea placeholder="คำอธิบายหลักเพิ่มเติม (ไม่บังคับ)" value={section.body} onChange={(event) => updateSection(si, { body: event.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                        </div>
                      )}
                      <div className="space-y-2">
                        {section.rows.map((row, ri) => (
                          <div key={ri} className="flex items-start gap-2 rounded-xl bg-slate-50 p-2.5">
                            <div className="flex-1 min-w-0 space-y-1">
                              <input type="text" placeholder="กฎ / เงื่อนไข" value={row.left} onChange={(event) => updateRow(si, ri, { left: event.target.value })} data-highlight-field={`${si}-row-${ri}-left`} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                              <HighlightFieldToggle fieldKey={`${si}-row-${ri}-left`} onApply={(el) => toggleHighlight(el, (value) => updateRow(si, ri, { left: value }))} />
                              <input type="text" placeholder="ตัวอย่างหรือผลลัพธ์ (ไม่บังคับ)" value={row.right} onChange={(event) => updateRow(si, ri, { right: event.target.value })} data-highlight-field={`${si}-row-${ri}-right`} className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                              <HighlightFieldToggle fieldKey={`${si}-row-${ri}-right`} onApply={(el) => toggleHighlight(el, (value) => updateRow(si, ri, { right: value }))} />
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button onClick={() => moveRow(si, ri, 'up')} disabled={ri === 0} aria-label="เลื่อนแถวขึ้น" className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => moveRow(si, ri, 'down')} disabled={ri === section.rows.length - 1} aria-label="เลื่อนแถวลง" className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                              <button onClick={() => removeRow(si, ri)} aria-label="ลบแถว" className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => addRow(si)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"><Plus className="w-3.5 h-3.5" /> เพิ่มแถวคำอธิบาย → ตัวอย่าง</button>
                      </div>
                      {section.type === 'rule' && (
                        <div className="space-y-2 rounded-xl border border-slate-100 p-3">
                          <p className="text-xs font-bold text-slate-600">Example Cards</p>
                          {section.examples.map((example, ei) => (
                            <div key={ei} className="grid gap-2 rounded-xl bg-slate-50 p-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
                              <div className="space-y-0.5"><input placeholder="ประโยคตัวอย่าง" value={example.en} onChange={(event) => updateExample(si, ei, { en: event.target.value })} data-highlight-field={`${si}-example-${ei}-en`} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /><HighlightFieldToggle fieldKey={`${si}-example-${ei}-en`} onApply={(el) => toggleHighlight(el, (value) => updateExample(si, ei, { en: value }))} /></div>
                              <div className="space-y-0.5"><input placeholder="คำแปล/คำอธิบาย (ไม่บังคับ)" value={example.th} onChange={(event) => updateExample(si, ei, { th: event.target.value })} data-highlight-field={`${si}-example-${ei}-th`} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /><HighlightFieldToggle fieldKey={`${si}-example-${ei}-th`} onApply={(el) => toggleHighlight(el, (value) => updateExample(si, ei, { th: value }))} /></div>
                              <select aria-label={`สถานะตัวอย่าง ${ei + 1}`} value={example.ok ? 'correct' : 'incorrect'} onChange={(event) => updateExample(si, ei, { ok: event.target.value === 'correct' })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"><option value="correct">ถูก</option><option value="incorrect">ไม่ถูก</option></select>
                              <button onClick={() => removeExample(si, ei)} aria-label="ลบตัวอย่าง" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button>
                            </div>
                          ))}
                          <button onClick={() => addExample(si)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"><Plus className="size-3.5" /> เพิ่ม Example Card</button>
                        </div>
                      )}
                      <div className="space-y-1">
                        <input type="text" placeholder="Summary / Tip ด้านล่าง (ไม่บังคับ) รองรับ ==ไฮไลต์==" value={section.tip} onChange={(event) => updateSection(si, { tip: event.target.value })} data-highlight-field={`${si}-tip`} className="w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <HighlightFieldToggle fieldKey={`${si}-tip`} onApply={(el) => toggleHighlight(el, (value) => updateSection(si, { tip: value }))} />
                      </div>
                    </>
                  )}

                  {section.type === 'importantNote' && (
                    <p className="text-xs text-amber-700">แสดงเป็นการ์ดจุดสำคัญขนาดกะทัดรัดพร้อมไอคอนหลอดไฟ</p>
                  )}

                  {section.type === 'practice' && (
                    <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      {section.practice.map((question, qi) => (
                        <div key={qi} className="space-y-2 rounded-xl border border-emerald-100 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-extrabold text-emerald-700">โจทย์ที่ {qi + 1}</p>
                            <div className="flex items-center">
                              <button type="button" onClick={() => movePracticeQuestion(si, qi, 'up')} disabled={qi === 0} aria-label="เลื่อนโจทย์ Mini Quiz ขึ้น" className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="size-4" /></button>
                              <button type="button" onClick={() => movePracticeQuestion(si, qi, 'down')} disabled={qi === section.practice.length - 1} aria-label="เลื่อนโจทย์ Mini Quiz ลง" className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="size-4" /></button>
                              <button type="button" onClick={() => removePracticeQuestion(si, qi)} disabled={section.practice.length <= 1} aria-label="ลบโจทย์ Mini Quiz" className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="size-4" /></button>
                            </div>
                          </div>
                          <input placeholder="ประโยคคำถาม ใช้ ____ แทนช่องว่าง" value={question.sentence} onChange={(event) => updatePractice(si, qi, { sentence: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" />
                          {question.options.map((option, oi) => <div key={oi} className="flex gap-2"><input placeholder={`ตัวเลือก ${oi + 1}`} value={option} onChange={(event) => updatePracticeOption(si, qi, oi, event.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /><label className="flex items-center gap-1 text-xs text-slate-600"><input type="radio" name={`practice-answer-${si}-${qi}`} checked={question.answerIndex === oi} onChange={() => updatePractice(si, qi, { answerIndex: oi })} /> เฉลย</label><button onClick={() => removePracticeOption(si, qi, oi)} disabled={question.options.length <= 2} aria-label="ลบตัวเลือก" className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="size-4" /></button></div>)}
                          <button onClick={() => addPracticeOption(si, qi)} className="text-xs font-semibold text-emerald-700">+ เพิ่มตัวเลือก</button>
                          <textarea placeholder="คำอธิบายหลังตอบ (ไม่บังคับ)" value={question.explanation} onChange={(event) => updatePractice(si, qi, { explanation: event.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" />
                        </div>
                      ))}
                      <button onClick={() => addPracticeQuestion(si)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><Plus className="size-3.5" /> เพิ่มโจทย์ใน Mini Quiz</button>
                    </div>
                  )}
                </div>
              </div>
            ))}


            <div className="flex justify-center">
              <label className="group inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-sky-400 hover:bg-sky-50/40 hover:text-sky-700 cursor-pointer">
                <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-sky-100 group-hover:text-sky-600">
                  <Plus className="w-3.5 h-3.5" />
                </span> เพิ่ม Section
                <select
                  aria-label="เลือกรูปแบบ Section ใหม่"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) addSection(event.target.value as SectionType);
                  }}
                  className="max-w-36 bg-transparent text-sm font-bold outline-none cursor-pointer"
                >
                  <option value="" disabled>เลือกรูปแบบ…</option>
                  <option value="rule">Rule / Grammar Card</option>
                  <option value="detailedRule">Rule / Grammar แบบละเอียด</option>
                  <option value="importantNote">Important Note / Key Point</option>
                  <option value="practice">Mini Quiz / Practice</option>
                </select>
              </label>
            </div>

            {/* Vocab bank — flexible columns */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" /> คลังศัพท์ช่วยชีวิต
              </p>
              <p className="text-xs text-slate-400 mb-3">ตารางสรุปแบบกำหนดคอลัมน์เองได้ (อย่างน้อย 2 คอลัมน์) — แสดงใน Modal บนหน้าบทเรียน (ไม่บังคับ)</p>

              {/* Column headers + remove-column buttons */}
              <div className="flex items-end gap-2 mb-2">
                {vocab.columns.map((col, ci) => (
                  <div key={ci} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder={`ชื่อคอลัมน์ ${ci + 1}`}
                        value={col}
                        onChange={(e) => renameVocabColumn(ci, e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 border border-amber-200 bg-amber-50/60 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        onClick={() => removeVocabColumn(ci)}
                        disabled={vocab.columns.length <= 2}
                        title={vocab.columns.length <= 2 ? 'ต้องมีอย่างน้อย 2 คอลัมน์' : 'ลบคอลัมน์นี้'}
                        className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="w-[52px] shrink-0" />
              </div>

              {/* Rows */}
              <div className="space-y-2 mb-2">
                {vocab.rows.map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    {vocab.columns.map((_, ci) => (
                      <input
                        key={ci}
                        type="text"
                        value={row.cells[ci] ?? ''}
                        onChange={(e) => setVocabCell(ri, ci, e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    ))}
                    <button
                      onClick={() => removeVocabRow(ri)}
                      className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={addVocabRow}
                  disabled={vocab.rows.length === 0 && vocab.columns.some((c) => !c.trim())}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มแถว
                </button>
                <button
                  onClick={addVocabColumn}
                  disabled={vocab.columns.length >= 8}
                  title={vocab.columns.length >= 8 ? 'สูงสุด 8 คอลัมน์' : 'เพิ่มคอลัมน์ใหม่ทางขวา'}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 px-2.5 py-1.5 rounded-lg disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มคอลัมน์
                </button>
                <button
                  onClick={openVocabImport}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
              </div>

              {/* Import paste area */}
              {vocabImportOpen && (
                <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-3 mt-3">
                  <p className="text-xs font-bold text-amber-700 mb-1.5">วางข้อมูลคลังศัพท์ (CSV / TSV / Excel)</p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    แถวแรกคือชื่อคอลัมน์ (2–8 คอลัมน์) · คัดลอกจาก Excel / Google Sheets แล้ววางได้เลย
                  </p>
                  <textarea
                    value={vocabImportText}
                    onChange={(e) => setVocabImportText(e.target.value)}
                    rows={6}
                    placeholder={"ประธาน,รูปกริยา,ตัวอย่าง\nHe / She / It,เติม s / es,She plays tennis.\nI / You / We / They,ไม่เติม s,They play tennis."}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={applyVocabImport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                    >
                      <Upload className="w-3.5 h-3.5" /> นำเข้า
                    </button>
                    <button
                      onClick={() => setVocabImportOpen(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============ TAP & SELECT PAGE ============ */}
        {pageType === 'tap' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-teal-600 mb-1">Tap & Select — ฝึกแยกถูก/ผิด (ทั้งหน้า)</p>
            <p className="text-xs text-slate-400 mb-3">ผู้เรียนจะเจอโจทย์ทีละข้อบนหน้าแยกของบทเรียน ระหว่างเนื้อหากับ Real Exam</p>

            <input
              type="text"
              placeholder="ชื่อคำสั่ง เช่น แตะเลือกว่าประโยคนี้ถูกหรือผิด"
              value={sections[0]?.tap?.title ?? ''}
              onChange={(e) => updateTap(0, { title: e.target.value })}
              className="w-full mb-2 px-2.5 py-1.5 border border-teal-200 bg-teal-50/40 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
            />

            {/* Items — each with its own prompt + 2 editable choices */}
            <div className="space-y-2">
              {(sections[0]?.tap?.items ?? []).map((it, ii) => (
                <div key={ii} className="bg-white rounded-lg border border-teal-100 p-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-teal-500 shrink-0 w-5 text-center">{ii + 1}</span>
                    <input
                      type="text"
                      placeholder="โจทย์ เช่น She work at a bank."
                      value={it.prompt}
                      onChange={(e) => updateTapItem(0, ii, { prompt: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button onClick={() => removeTapItem(0, ii)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0" title="ลบโจทย์นี้"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-1.5 pl-7">
                    {[0, 1].map((choice) => {
                      const isA = choice === 0;
                      return (
                        <div key={choice} className="flex-1 min-w-0 flex items-center gap-1">
                          <input
                            type="text"
                            placeholder={`ตัวเลือก ${isA ? 'A' : 'B'} (เช่น ${isA ? 'ถูก' : 'ผิด'})`}
                            value={isA ? it.choiceA : it.choiceB}
                            onChange={(e) => updateTapItem(0, ii, isA ? { choiceA: e.target.value } : { choiceB: e.target.value })}
                            className="flex-1 min-w-0 px-2 py-1.5 border border-teal-200 bg-teal-50/40 rounded-lg text-xs font-bold text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                          />
                          <button
                            type="button"
                            onClick={() => updateTapItem(0, ii, { correct: (isA ? 0 : 1) as 0 | 1 })}
                            className={`shrink-0 w-7 h-7 rounded-lg text-[10px] font-black transition-colors ${
                              it.correct === choice
                                ? isA
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                                : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                            }`}
                            title={`กำหนดให้ตัวเลือก ${isA ? 'A' : 'B'} เป็นคำตอบที่ถูก`}
                          >
                            {isA ? 'A' : 'B'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => addTapItem(0)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> เพิ่มโจทย์
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5">แต่ละโจทย์มี 2 ตัวเลือกของตัวเอง — แก้ไขข้อความได้ และกด A/B เพื่อกำหนดคำตอบที่ถูก</p>
          </div>
        )}

        {/* ============ QUIZ PAGE ============ */}
        {pageType === 'quiz' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-700">Real Exam</h2>
                <p className="text-xs text-slate-400 mt-1">รวมข้อสอบหลายข้อไว้ในหน้าเดียวได้เลย</p>
              </div>
              <button
                type="button"
                onClick={addQuizQuestion}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มข้อสอบ
              </button>
            </div>

            {quiz.map((question, qi) => (
              <div key={qi} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-purple-700">ข้อสอบที่ {qi + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeQuizQuestion(qi)}
                    disabled={quiz.length <= 1}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบข้อสอบ
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">โจทย์ประโยค (ใช้ ____ เป็นช่องว่าง)</label>
                  <input
                    type="text"
                    placeholder="I ____ two brothers."
                    value={question.sentence}
                    onChange={(e) => updateQuiz(qi, { sentence: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">ตัวเลือก (คลิกวงกลมเพื่อเลือกคำตอบที่ถูก)</label>
                    {question.options.length < 6 && (
                      <button type="button" onClick={() => addOption(qi)} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded-lg">
                        <Plus className="w-3.5 h-3.5" /> เพิ่มตัวเลือก
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {question.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-2.5">
                        <button
                          type="button"
                          onClick={() => updateQuiz(qi, { answerIndex: oi })}
                          className={`w-7 h-7 rounded-full shrink-0 text-xs font-black border-2 flex items-center justify-center transition-colors ${question.answerIndex === oi ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400 hover:border-slate-400'}`}
                          title={question.answerIndex === oi ? 'คำตอบที่ถูกต้อง' : 'ตั้งเป็นคำตอบที่ถูกต้อง'}
                        >
                          {String.fromCharCode(65 + oi)}
                        </button>
                        <input
                          type="text"
                          placeholder={`ตัวเลือก ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={(e) => updateQuizOption(qi, oi, e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <button type="button" onClick={() => removeOption(qi, oi)} disabled={question.options.length <= 2} className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">คำอธิบายเหตุผล (แสดงเมื่อกด &quot;อธิบายเหตุผลสั้นๆ&quot;)</label>
                  <textarea
                    placeholder="อธิบายว่าทำไมคำตอบนี้ถึงถูก เช่น Do ใช้กับ I / you / we / they…"
                    value={question.explanation}
                    onChange={(e) => updateQuiz(qi, { explanation: e.target.value })}
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-6 flex items-center justify-between">
          <Link href="/admin/units" className="btn-secondary !py-2.5 !px-5 text-sm inline-flex items-center gap-2">
            <X className="w-4 h-4" /> ยกเลิก
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {pageId ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างหน้านี้'}
          </button>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryOpen(false)}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800"><History className="w-5 h-5 text-sky-600" /> ประวัติการแก้ไข</h2>
                <p className="mt-1 text-xs text-slate-400">ระบบจะเก็บฉบับก่อนหน้าไว้ทุกครั้งที่กดบันทึก</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {versions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีประวัติ การบันทึกครั้งถัดไปจะสร้างเวอร์ชันแรก</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div key={version.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-700">v{version.version}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-700">{version.changeType === 'restore' ? 'กู้คืนเวอร์ชัน' : version.changeType === 'publish' ? 'ก่อนเผยแพร่' : 'ก่อนแก้ไข'}</p>
                        <p className="text-xs text-slate-400">{new Date(version.createdAt).toLocaleString('th-TH')}</p>
                      </div>
                      <button type="button" onClick={() => restoreVersion(version.id)} disabled={restoringVersion !== null} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-sky-600 shadow-sm hover:bg-sky-50 disabled:opacity-50">
                        {restoringVersion === version.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        กู้คืน
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
