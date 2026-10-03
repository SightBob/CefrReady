'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, Download,
  Eye, FileUp, Highlighter, Loader2, Plus, Trash2, Upload, X,
} from 'lucide-react';
import ReviewContent from '@/components/ReviewContent';
import RichText from '@/components/RichText';
import { normalizeLessonSection, type LessonSection } from '@/lib/lesson-sections';
import { readableTextColor } from '@/lib/rich-text';
import type { TestExplainContent } from '@/components/TestExplainOverlay';

// ============================================================
// User-managed highlight colors (persisted in localStorage)
// ============================================================

interface SavedColor { hex: string; mode: 'background' | 'text' }
const SAVED_COLORS_KEY = 'admin-highlight-colors';
const SAVED_COLORS_LIMIT = 24;

const DEFAULT_SAVED_COLORS: SavedColor[] = [
  { hex: '#FEF08A', mode: 'background' },
  { hex: '#BBF7D0', mode: 'background' },
  { hex: '#FECACA', mode: 'background' },
  { hex: '#BFDBFE', mode: 'background' },
  { hex: '#DDD6FE', mode: 'background' },
  { hex: '#FED7AA', mode: 'background' },
  { hex: '#FBCFE8', mode: 'background' },
  { hex: '#A5F3FC', mode: 'background' },
  { hex: '#E5E7EB', mode: 'background' },
  { hex: '#FFFFFF', mode: 'background' },
  { hex: '#DC2626', mode: 'text' },
  { hex: '#2563EB', mode: 'text' },
];

function loadSavedColors(): SavedColor[] {
  if (typeof window === 'undefined') return DEFAULT_SAVED_COLORS;
  try {
    const raw = window.localStorage.getItem(SAVED_COLORS_KEY);
    if (!raw) return DEFAULT_SAVED_COLORS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SAVED_COLORS;
    const colors = parsed.filter((item): item is SavedColor => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<SavedColor>;
      return typeof candidate.hex === 'string' && /^#[\da-fA-F]{3,8}$/.test(candidate.hex) && (candidate.mode === 'text' || candidate.mode === 'background');
    });
    return colors.length ? colors : DEFAULT_SAVED_COLORS;
  } catch {
    return DEFAULT_SAVED_COLORS;
  }
}

// ============================================================
// Types (mirror test_explains.sections JSONB shapes)
// ============================================================

interface TopicOption { grammarTopic: string; questionCount: number }
interface ExplainRow extends TestExplainContent { isPublished: boolean; questionCount: number; updatedAt: string }

interface ExampleRow { en: string; th: string; ok: boolean }
interface RowDraft { left: string; right: string }
interface QuizRow { sentence: string; options: string[]; answerIndex: number; explanation: string }

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
});
const emptyRow = (): RowDraft => ({ left: '', right: '' });
const emptyExample = (): ExampleRow => ({ en: '', th: '', ok: true });

// Full JSON example shown in the import guide modal (plain string → no JSX escaping issues)
const JSON_EXAMPLE = `{
  "grammarTopic": "Present Simple",
  "title": "Present Simple",
  "intro": "ใช้เล่าเหตุการณ์ปัจจุบัน",
  "sections": [
    {
      "type": "rule",
      "heading": "หลักการใช้",
      "chip": "I/You/We/They",
      "description": "ใช้รูปพื้นฐานของกริยา",
      "rows": [
        { "left": "I play", "right": "I play tennis" }
      ],
      "examples": [
        { "en": "She plays tennis", "th": "เธอเล่นเทนนิส", "ok": true }
      ]
    }
  ],
  "tip": "==yellow;อย่าลืมเติม s== กับ he/she/it",
  "isPublished": true
}`;

function toSectionDraft(value: LessonSection): SectionRow {
  const normalized = normalizeLessonSection(value);
  const type = normalized.type ?? 'rule';
  return {
    ...emptySection(type),
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
  };
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

// ============================================================
// Highlight markup helpers (same contract as LessonPageEditor)
// ============================================================

/** Wrap the current selection with the chosen highlight marker (or plain bold). */
function wrapMarkup(el: HTMLTextAreaElement | HTMLInputElement, marker: string, close: string): { value: string; caretStart: number; caretEnd: number } {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const selected = el.value.slice(start, end) || 'ข้อความ';
  const wrapped = `${marker}${selected}${close}`;
  return { value: el.value.slice(0, start) + wrapped + el.value.slice(end), caretStart: start + marker.length, caretEnd: start + marker.length + selected.length };
}

const HighlightFieldToggle = ({ fieldKey, marker, onApply }: { fieldKey: string; marker: string; onApply: (value: string, caretStart: number, caretEnd: number) => void }) => (
  <button
    type="button"
    onClick={() => {
      const el = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`[data-highlight-field="${fieldKey}"]`);
      if (!el) return;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      if (start === end) {
        toast.info('คลุมข้อความที่ต้องการไฮไลต์ก่อน แล้วกดปุ่มอีกครั้ง');
        return;
      }
      // Bold marker wraps **text**; a highlight directive (e.g. "#FFF28F",
      // "text:#FFF28F" or "transparent") becomes the full ==directive;text== form.
      const [openMarker, closeMarker] = marker === '**' ? ['**', '**'] : [`==${marker};`, '=='];
      const result = wrapMarkup(el, openMarker, closeMarker);
      onApply(result.value, result.caretStart, result.caretEnd);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(result.caretStart, result.caretEnd);
      });
    }}
    title={marker === '**' ? 'คลุมข้อความแล้วกดเพื่อทำตัวหนา' : `คลุมข้อความแล้วกดเพื่อไฮไลต์ด้วย ==${marker};...==`}
    className="inline-flex items-center gap-1 self-end rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors"
  >
    <Highlighter className="w-3 h-3" /> {marker === '**' ? 'ตัวหนา' : 'ไฮไลต์'}
  </button>
);

// ============================================================
// TestExplainEditor
// ============================================================

export default function TestExplainEditor({ explainId, mode = 'list' }: { explainId?: number; mode?: 'list' | 'edit' }) {
  const router = useRouter();
  const [rows, setRows] = useState<ExplainRow[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [grammarTopic, setGrammarTopic] = useState('');
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [sections, setSections] = useState<SectionRow[]>([emptySection()]);
  const [tip, setTip] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  // ชุดข้อสอบที่ผูกเนื้อหานี้ไว้ — เปิด overlay อัตโนมัติเมื่อเริ่มทำชุด
  const [testSetIds, setTestSetIds] = useState<number[]>([]);
  const [availableTestSets, setAvailableTestSets] = useState<{ id: number; sectionId: string; name: string }[]>([]);
  const [selectedColor, setSelectedColor] = useState<SavedColor>({ hex: '#FEF08A', mode: 'background' });
  const [savedColors, setSavedColors] = useState<SavedColor[]>(DEFAULT_SAVED_COLORS);
  const [newColorHex, setNewColorHex] = useState('#FEF08A');
  const [newColorMode, setNewColorMode] = useState<'background' | 'text'>('background');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<null | {
    success: boolean; message?: string; created: number; updated: number; failed: number;
    results: Array<{ grammarTopic: string; status: string; message?: string }>;
    error?: string;
  }>(null);
  const pendingImportFile = useRef<File | null>(null);

  // Selected color → markup directive: background mode = ==#hex;text==, text mode = ==text:#hex;text==,
  // white background = transparent marker (identical rendering, keeps old markup working).
  const highlightDirective = selectedColor.mode === 'text'
    ? `text:${selectedColor.hex}`
    : selectedColor.hex.toUpperCase() === '#FFFFFF'
      ? 'transparent'
      : selectedColor.hex;

  // Load saved colors once on mount.
  useEffect(() => {
    setSavedColors(loadSavedColors());
  }, []);

  const persistColors = (colors: SavedColor[]) => {
    setSavedColors(colors);
    try {
      window.localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(colors));
    } catch {
      // localStorage unavailable (private mode etc.) — colors just won't persist.
    }
  };

  const addSavedColor = () => {
    if (!/^#[\da-fA-F]{6}$/.test(newColorHex)) {
      toast.error('รหัสสีไม่ถูกต้อง — ต้องเป็น HEX 6 หลัก เช่น #FFB6C1');
      return;
    }
    if (savedColors.some((color) => color.hex.toLowerCase() === newColorHex.toLowerCase() && color.mode === newColorMode)) {
      toast.info('มีสีนี้ในลิสต์อยู่แล้ว');
      return;
    }
    const next = [{ hex: newColorHex.toUpperCase(), mode: newColorMode }, ...savedColors].slice(0, SAVED_COLORS_LIMIT);
    persistColors(next);
    setSelectedColor({ hex: newColorHex.toUpperCase(), mode: newColorMode });
    toast.success(`เพิ่มสี ${newColorHex.toUpperCase()} (${newColorMode === 'text' ? 'ตัวอักษร' : 'พื้นหลัง'}) แล้ว — ระบบจะจำไว้ให้`);
  };

  const removeSavedColor = (index: number) => {
    const target = savedColors[index];
    const next = savedColors.filter((_, i) => i !== index);
    persistColors(next);
    if (selectedColor.hex === target.hex && selectedColor.mode === target.mode) {
      setSelectedColor(next[0] ?? DEFAULT_SAVED_COLORS[0]);
    }
  };

  const parsedSections = useMemo(
    () => sections.filter(sectionHasContent).map(sectionToPayload),
    [sections],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [explainsResponse, topicsResponse, setsResponse] = await Promise.all([
        fetch('/api/admin/test-explains', { cache: 'no-store' }),
        fetch('/api/admin/test-explains/topics', { cache: 'no-store' }),
        fetch('/api/admin/test-sets', { cache: 'no-store' }),
      ]);
      const [explainsPayload, topicsPayload, setsPayload] = await Promise.all([explainsResponse.json(), topicsResponse.json(), setsResponse.json()]);
      if (!setsResponse.ok || !setsPayload.success) throw new Error(setsPayload.error ?? 'โหลดรายการชุดข้อสอบไม่สำเร็จ');
      if (!explainsResponse.ok || !explainsPayload.success) throw new Error(explainsPayload.error ?? 'โหลดเนื้อหาไม่สำเร็จ');
      if (!topicsResponse.ok || !topicsPayload.success) throw new Error(topicsPayload.error ?? 'โหลดหัวข้อข้อสอบไม่สำเร็จ');
      const explainRows = explainsPayload.data as ExplainRow[];
      const topicRows = topicsPayload.data as TopicOption[];
      setRows(explainRows);
      setTopics(topicRows);
      // /api/admin/test-sets คืนแบบ grouped by section — flatten ออกมาเป็นรายการชุด
      const groupedSets = Array.isArray(setsPayload.data)
        ? (setsPayload.data as { testSets?: { id: number; sectionId: string; name: string }[] }[])
        : [];
      setAvailableTestSets(groupedSets.flatMap((group) => group.testSets ?? []));
      if (mode === 'edit' && explainId) {
        const selected = explainRows.find((row) => row.id === explainId);
        if (!selected) throw new Error('ไม่พบ explain ที่ต้องการแก้ไข');
        setGrammarTopic(selected.grammarTopic);
        setTitle(selected.title);
        setIntro(selected.intro ?? '');
        setSections(selected.sections?.length ? selected.sections.map(toSectionDraft) : [emptySection()]);
        setTip(selected.tip ?? '');
        setIsPublished(selected.isPublished);
        setTestSetIds(selected.testSetIds ?? []);
      } else {
        setGrammarTopic(topicRows[0]?.grammarTopic ?? '');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [explainId, mode]);

  useEffect(() => { void load(); }, [load]);

  // ---------- Section helpers ----------
  const updateSection = (i: number, patch: Partial<SectionRow>) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));

  const addSection = (type: SectionType = 'rule') => setSections((s) => [...s, emptySection(type)]);
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));
  const moveSection = (i: number, dir: 'up' | 'down') =>
    setSections((s) => {
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  // Rows within a section
  const updateRow = (si: number, ri: number, patch: Partial<RowDraft>) =>
    setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, rows: sec.rows.map((row, i2) => (i2 === ri ? { ...row, ...patch } : row)) } : sec)));
  const addRow = (si: number) =>
    setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, rows: [...sec.rows, emptyRow()] } : sec)));
  const removeRow = (si: number, ri: number) =>
    setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, rows: sec.rows.filter((_, i2) => i2 !== ri) } : sec)));
  const moveRow = (si: number, ri: number, dir: 'up' | 'down') =>
    setSections((s) => s.map((sec, idx) => {
      if (idx !== si) return sec;
      const j = dir === 'up' ? ri - 1 : ri + 1;
      if (j < 0 || j >= sec.rows.length) return sec;
      const rows = [...sec.rows];
      [rows[ri], rows[j]] = [rows[j], rows[ri]];
      return { ...sec, rows };
    }));

  // Example cards within a section
  const addExample = (si: number) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, examples: [...sec.examples, emptyExample()] } : sec)));
  const updateExample = (si: number, ei: number, patch: Partial<ExampleRow>) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, examples: sec.examples.map((example, j) => (j === ei ? { ...example, ...patch } : example)) } : sec)));
  const removeExample = (si: number, ei: number) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, examples: sec.examples.filter((_, j) => j !== ei) } : sec)));

  // Mini Quiz practice questions
  const updatePractice = (si: number, qi: number, patch: Partial<QuizRow>) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, practice: sec.practice.map((q, j) => (j === qi ? { ...q, ...patch } : q)) } : sec)));
  const updatePracticeOption = (si: number, qi: number, oi: number, value: string) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, practice: sec.practice.map((q, j) => (j === qi ? { ...q, options: q.options.map((o, k) => (k === oi ? value : o)) } : q)) } : sec)));
  const addPracticeOption = (si: number, qi: number) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, practice: sec.practice.map((q, j) => (j === qi ? { ...q, options: [...q.options, ''] } : q)) } : sec)));
  const removePracticeOption = (si: number, qi: number, oi: number) =>
    setSections((s) => s.map((sec, i) => {
      if (i !== si) return sec;
      return { ...sec, practice: sec.practice.map((q, j) => {
        if (j !== qi || q.options.length <= 2) return q;
        const options = q.options.filter((_, k) => k !== oi);
        return { ...q, options, answerIndex: Math.min(q.answerIndex, options.length - 1) };
      }) };
    }));
  const addPracticeQuestion = (si: number) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, practice: [...sec.practice, { sentence: '', options: ['', '', ''], answerIndex: 0, explanation: '' }] } : sec)));
  const removePracticeQuestion = (si: number, qi: number) =>
    setSections((s) => s.map((sec, i) => (i === si && sec.practice.length > 1 ? { ...sec, practice: sec.practice.filter((_, j) => j !== qi) } : sec)));
  const movePracticeQuestion = (si: number, qi: number, direction: 'up' | 'down') =>
    setSections((sections) => sections.map((section, index) => {
      if (index !== si) return section;
      const target = direction === 'up' ? qi - 1 : qi + 1;
      if (target < 0 || target >= section.practice.length) return section;
      const questions = [...section.practice];
      [questions[qi], questions[target]] = [questions[target], questions[qi]];
      return { ...section, practice: questions };
    }));

  // ---------- Import / Export (list mode) ----------
  const exportAll = () => {
    window.location.href = '/api/admin/test-explains/export';
  };

  const openImport = () => {
    pendingImportFile.current = null;
    setImportResult(null);
    setImportOpen(true);
  };

  const runImport = async (mode: 'validate-only' | 'upsert') => {
    const file = pendingImportFile.current;
    if (!file) {
      toast.error('เลือกไฟล์ JSON ก่อน');
      return;
    }
    setImportBusy(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const explains = (parsed as { explains?: unknown })?.explains;
      if (!Array.isArray(explains) || !explains.length) throw new Error('ไฟล์ต้องเป็น JSON ที่มี explains เป็น array (ดูคู่มือรูปแบบไฟล์ด้านล่าง)');
      const response = await fetch('/api/admin/test-explains/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explains, mode: mode === 'upsert' ? 'upsert' : undefined }),
      });
      const payload = await response.json();
      setImportResult(payload);
      if (payload.success && mode === 'upsert') {
        toast.success(payload.message ?? 'นำเข้าสำเร็จ');
        await load();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'นำเข้าไม่สำเร็จ';
      setImportResult({ success: false, error: message, created: 0, updated: 0, failed: 0, results: [] });
    } finally {
      setImportBusy(false);
    }
  };

  // ---------- Delete row ----------
  const removeExplain = (id: number) => {
    if (!confirm('ลบ explain นี้หรือไม่? ข้อสอบที่ผูก grammarTopic เดิมจะไม่มีเนื้อหาให้อ่านต่อ')) return;
    void fetch(`/api/admin/test-explains/${id}`, { method: 'DELETE' }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'ลบไม่สำเร็จ');
      toast.success('ลบ explain แล้ว');
      if (explainId === id) router.push('/admin/test-explains');
      else await load();
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'ลบไม่สำเร็จ'));
  };

  // ---------- Validation + save ----------
  const validationWarnings = sections.flatMap((section, index) => {
    if (section.type !== 'practice') return [];
    if (!section.practice.some((question) => question.sentence.trim())) return [`Mini Quiz Section ${index + 1} ต้องมีโจทย์อย่างน้อย 1 ข้อ`];
    return section.practice.flatMap((question, questionIndex) => {
      if (!question.sentence.trim()) return [];
      if (question.options.filter((option) => option.trim()).length < 2) return [`Mini Quiz Section ${index + 1} ข้อ ${questionIndex + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`];
      if (!question.options[question.answerIndex]?.trim()) return [`Mini Quiz Section ${index + 1} ข้อ ${questionIndex + 1} ต้องกำหนดคำตอบที่ถูกต้อง`];
      return [];
    });
  });

  const save = async () => {
    if (!grammarTopic.trim() || !title.trim()) {
      toast.error('กรุณาระบุ grammarTopic และชื่อเนื้อหา');
      return;
    }
    if (isPublished && validationWarnings.length > 0) {
      toast.error(`ยังเผยแพร่ไม่ได้: ${validationWarnings[0]}`);
      return;
    }
    const payloadSections = sections.filter(sectionHasContent).map(sectionToPayload);
    if (!payloadSections.length) {
      toast.error('ต้องมีอย่างน้อย 1 Section ที่มีเนื้อหา');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(mode === 'edit' && explainId ? `/api/admin/test-explains/${explainId}` : '/api/admin/test-explains', {
        method: mode === 'edit' && explainId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grammarTopic: grammarTopic.trim(), title: title.trim(), intro, sections: payloadSections, tip, testSetIds, isPublished }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'บันทึกไม่สำเร็จ');
      toast.success('บันทึกเนื้อหาสำหรับข้อสอบแล้ว');
      if (mode === 'list' && payload.data?.id) router.push(`/admin/test-explains/${payload.data.id}`);
      else router.push('/admin/test-explains');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>;

  if (mode === 'list') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Admin</Link>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-black text-slate-900">เนื้อหา Explain สำหรับข้อสอบ</h1><p className="mt-1 text-sm text-slate-500">เนื้อหาแยกจาก UnitsPath และเชื่อมกับข้อสอบผ่าน grammarTopic</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openImport} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-700"><FileUp className="h-4 w-4" /> Import</button>
            <button type="button" onClick={exportAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-700"><Download className="h-4 w-4" /> Export</button>
            <Link href="/admin/test-explains/new" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"><Plus className="h-4 w-4" /> สร้าง Explain</Link>
          </div>
        </div>
        {rows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">ยังไม่มีเนื้อหา Explain สำหรับข้อสอบ</div> : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 last:border-0">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-800">{row.title}</h2><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${row.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.isPublished ? 'เผยแพร่' : 'ฉบับร่าง'}</span></div><p className="mt-1 text-sm text-slate-500">{row.grammarTopic} · {row.questionCount} ข้อสอบ · อัปเดต {new Date(row.updatedAt).toLocaleDateString('th-TH')}</p></div>
              <Link href={`/admin/test-explains/${row.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50">แก้ไข</Link>
              <button type="button" onClick={() => removeExplain(row.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`ลบ ${row.title}`}><Trash2 className="h-4 w-4" /></button>
            </div>)}
          </div>
        )}

        {importOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !importBusy && setImportOpen(false)}>
            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800"><FileUp className="h-5 w-5 text-sky-600" /> นำเข้า / ส่งออก Explain</h2>
                  <p className="mt-1 text-xs text-slate-400">รองรับไฟล์ JSON รูปแบบเดียวกับที่ Export ให้ (round-trip ได้)</p>
                </div>
                <button type="button" onClick={() => setImportOpen(false)} disabled={importBusy} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4 p-5">
                {/* Download template row */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">1) Export ไฟล์ปัจจุบันเป็นตัวอย่าง</p>
                    <p className="text-xs text-slate-500">ดาวน์โหลด JSON ทั้งหมด ใช้เป็น template หรือส่งให้ AI ช่วยเขียนเพิ่มได้เลย</p>
                  </div>
                  <button type="button" onClick={exportAll} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"><Download className="h-3.5 w-3.5" /> Export JSON</button>
                </div>

                {/* Guide */}
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-3" open>
                  <summary className="cursor-pointer text-sm font-extrabold text-slate-700"><span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-amber-500" /> คู่มือรูปแบบไฟล์ JSON (กดเพื่อเปิด/ปิด)</span></summary>
                  <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600">
                    <div>
                      <p className="font-bold text-slate-700">โครงสร้างไฟล์ระดับบนสุด</p>
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-5 text-emerald-100">{'{\n  "explains": [ ...รายการ explain ด้านล่าง... ]\n}'}</pre>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">ฟิลด์ของ explain แต่ละรายการ</p>
                      <ul className="mt-1 space-y-1">
                        <li><code className="rounded bg-slate-200 px-1 font-mono">grammarTopic</code> <span className="text-rose-600">*บังคับ*</span> — ต้องตรงกับ <code className="rounded bg-slate-200 px-1 font-mono">questions.grammar_topic</code> ของข้อสอบเป๊ะ ๆ (case-sensitive) สูงสุด 200 ตัวอักษร, ห้ามซ้ำกันในไฟล์เดียว</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">title</code> <span className="text-rose-600">*บังคับ*</span> — ชื่อที่แสดงในหน้าอธิบาย สูงสุด 200 ตัวอักษร</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">intro</code> — บทนำ (string, ไม่บังคับ) รองรับ <code className="rounded bg-slate-200 px-1">**ตัวหนา**</code> และ <code className="rounded bg-slate-200 px-1">==ไฮไลต์==</code></li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">sections</code> <span className="text-rose-600">*บังคับ*</span> — array ของ Section (ดูรายละเอียดด้านล่าง) อย่างน้อย 1 อัน</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">tip</code> — เคล็ดลับท้ายหน้า (string, ไม่บังคับ)</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">isPublished</code> — true = เผยแพร่ / false = ฉบับร่าง (ค่าเริ่มต้น false)</li>
                        <li>ฟิลด์อื่นที่ไม่รู้จัก (เช่น id, createdAt, questionCount จากไฟล์ Export) จะถูก<b>ละเว้นโดยอัตโนมัติ</b> — นำเข้าซ้ำจากไฟล์ Export ได้ทันที</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">Section 4 ประเภท (เลือกใช้ type ใดก็ได้)</p>
                      <ul className="mt-1 space-y-1">
                        <li><code className="rounded bg-slate-200 px-1 font-mono">rule</code> — การ์ดกฎสั้น: heading, chip (ป้ายเหลือง), description, rows (ตาราง กฎ→ตัวอย่าง), examples (การ์ดตัวอย่าง en/th/ok), tip</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">detailedRule</code> — กฎแบบละเอียด: heading, chip, description, body (ย่อหน้ายาว), rows, tip</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">importantNote</code> — การ์ดจุดสำคัญ: heading, body, tip</li>
                        <li><code className="rounded bg-slate-200 px-1 font-mono">practice</code> — Mini Quiz: practice.questions[] = {'{ sentence, options[], answerIndex, explanation }'} (ต้องมีตัวเลือก ≥ 2 ข้อและ answerIndex ชี้ตัวเลือกที่มีข้อความ ถ้าจะเผยแพร่)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">ตัวอย่างเต็ม 1 รายการ</p>
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-5 text-emerald-100">{JSON_EXAMPLE}</pre>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
                      <p className="font-bold">ตัวเลือกการนำเข้า</p>
                      <p className="mt-0.5"><b>ตรวจสอบเท่านั้น</b> — ทดสอบว่าไฟล์ถูกต้องไหม ยังไม่บันทึกอะไรลงระบบ</p>
                      <p><b>นำเข้าจริง (อัปเดตทับได้)</b> — grammarTopic ที่มีอยู่แล้วจะถูก<b>แทนที่</b>ด้วยข้อมูลในไฟล์, อันใหม่จะถูกสร้าง</p>
                    </div>
                  </div>
                </details>

                {/* File picker */}
                <div>
                  <p className="text-sm font-bold text-slate-700">2) เลือกไฟล์ JSON ที่ต้องการนำเข้า</p>
                  <input
                    key={importResult ? 'has-result' : 'no-result'}
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => { pendingImportFile.current = event.target.files?.[0] ?? null; setImportResult(null); }}
                    className="mt-1.5 block w-full cursor-pointer rounded-lg border border-slate-200 text-sm file:mr-3 file:rounded-l-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-600 hover:file:bg-slate-200"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => runImport('validate-only')} disabled={importBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {importBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} ตรวจสอบเท่านั้น
                  </button>
                  <button type="button" onClick={() => { if (confirm('นำเข้าจริงหรือไม่? grammarTopic ที่มีอยู่แล้วจะถูกอัปเดตทับด้วยข้อมูลในไฟล์')) void runImport('upsert'); }} disabled={importBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {importBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} นำเข้าจริง (อัปเดตทับได้)
                  </button>
                </div>

                {/* Result */}
                {importResult && (
                  <div className={`rounded-xl border p-3 text-sm ${importResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                    <p className="font-bold">{importResult.error ?? importResult.message ?? (importResult.success ? 'ตรวจสอบผ่าน' : 'มีข้อผิดพลาด')}</p>
                    {importResult.results?.length > 0 && (
                      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                        {importResult.results.map((result, index) => (
                          <li key={index} className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${result.status === 'created' ? 'bg-emerald-100 text-emerald-700' : result.status === 'updated' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>{result.status === 'created' ? 'สร้างใหม่' : result.status === 'updated' ? 'อัปเดต' : 'ผิดพลาด'}</span>
                            <span className="font-semibold">{result.grammarTopic}</span>
                            {result.message && <span className="text-slate-500">— {result.message}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/test-explains" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> รายการ Explain</Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsPublished((v) => !v)} className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${isPublished ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} บันทึก
            </button>
          </div>
        </div>
        <h1 className="mb-6 text-2xl font-black text-slate-900">{mode === 'edit' ? 'แก้ไข' : 'สร้าง'} Explain สำหรับข้อสอบ</h1>

        {/* Validation checklist */}
        {validationWarnings.length > 0 && (
          <div className="mb-5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
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

        {/* Meta fields */}
        <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">เชื่อมกับ grammarTopic ของข้อสอบ
            <input list="question-topics" value={grammarTopic} onChange={(event) => setGrammarTopic(event.target.value)} maxLength={200} placeholder="เลือกหัวข้อ หรือพิมพ์ชื่อ grammarTopic" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-normal focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400" />
            <datalist id="question-topics">{topics.map((topic) => <option key={topic.grammarTopic} value={topic.grammarTopic}>{topic.questionCount} ข้อ</option>)}</datalist>
          </label>
          <label className="block text-sm font-bold text-slate-700">ชื่อที่แสดงในหน้าอธิบาย<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="เช่น Present Perfect" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-normal focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400" /></label>
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">บทนำ (ไม่บังคับ)
            <div className="flex items-end gap-1">
              <textarea id="explain-intro" value={intro} onChange={(event) => setIntro(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-normal focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400" data-highlight-field="intro" />
              <HighlightFieldToggle fieldKey="intro" marker="**" onApply={(value) => setIntro(value)} />
              <HighlightFieldToggle fieldKey="intro" marker={highlightDirective} onApply={(value) => setIntro(value)} />
            </div>
          </label>
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">เคล็ดลับท้ายหน้า (ไม่บังคับ)
            <div className="flex items-end gap-1">
              <textarea value={tip} onChange={(event) => setTip(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-normal focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400" data-highlight-field="tip" />
              <HighlightFieldToggle fieldKey="tip" marker="**" onApply={(value) => setTip(value)} />
              <HighlightFieldToggle fieldKey="tip" marker={highlightDirective} onApply={(value) => setTip(value)} />
            </div>
          </label>
          <div className="sm:col-span-2">
            <p className="text-sm font-bold text-slate-700">แสดงอัตโนมัติเมื่อเริ่มทำชุดข้อสอบ (ไม่บังคับ)</p>
            <p className="mt-0.5 text-xs text-slate-500">เลือกชุดที่ต้องการให้เปิดเนื้อหานี้ขึ้นมาทันทีที่ผู้เรียนกดเข้าทำชุด — ไม่เลือก = แสดงผ่านปุ่ม โหมดทบทวน ตาม grammarTopic เหมือนเดิม</p>
            {availableTestSets.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">ยังไม่มีชุดข้อสอบในระบบ</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTestSets.map((set) => {
                  const checked = testSetIds.includes(set.id);
                  return (
                    <label
                      key={set.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                        checked
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => setTestSetIds((current) =>
                          current.includes(set.id)
                            ? current.filter((id) => id !== set.id)
                            : [...current, set.id],
                        )}
                      />
                      {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {set.name || `ชุด #${set.id}`}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Highlight color picker (shared across all fields) */}
        <div className="sticky top-2 z-20 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <span className="text-xs font-bold text-slate-500">สีไฮไลต์:</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setColorPickerOpen((open) => !open)}
              aria-expanded={colorPickerOpen}
              aria-label="เลือกสีไฮไลต์"
              className="group flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-400"
            >
              <span className="relative inline-flex h-6 w-10 overflow-hidden rounded-lg border border-slate-200" style={{ background: selectedColor.mode === 'text' ? '#fff' : selectedColor.hex }}>
                {selectedColor.mode === 'text' && <span className="absolute inset-0 grid place-items-center font-black" style={{ color: selectedColor.hex }}>A</span>}
              </span>
              <span className="font-mono uppercase">{selectedColor.hex}</span>
              <span className={`rounded px-1 py-0.5 text-[10px] font-black ${selectedColor.mode === 'text' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>{selectedColor.mode === 'text' ? 'ตัวอักษร' : 'พื้นหลัง'}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${colorPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {colorPickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setColorPickerOpen(false)} />
                <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  {/* Saved colors — swatches, click to use, right-click or X to remove */}
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">สีที่บันทึกไว้ ({savedColors.length})</p>
                  {savedColors.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400">ยังไม่มีสีที่บันทึกไว้ — เพิ่มสีใหม่ด้านล่างได้เลย</p>
                  ) : (
                    <div className="grid grid-cols-6 gap-2">
                      {savedColors.map((color, index) => {
                        const isSelected = color.hex === selectedColor.hex && color.mode === selectedColor.mode;
                        return (
                          <div key={`${color.hex}-${color.mode}`} className="group relative">
                            <button
                              type="button"
                              title={`${color.hex} (${color.mode === 'text' ? 'ตัวอักษร' : 'พื้นหลัง'}) — คลิกเพื่อใช้`}
                              onClick={() => { setSelectedColor(color); setColorPickerOpen(false); }}
                              className={`relative h-10 w-full overflow-hidden rounded-xl border-2 transition-transform hover:scale-105 ${isSelected ? 'border-slate-800 ring-2 ring-slate-300' : 'border-black/10'}`}
                              style={{ background: color.mode === 'background' ? color.hex : '#fff' }}
                            >
                              {color.mode === 'text' && <span className="absolute inset-0 grid place-items-center font-black" style={{ color: color.hex }}>A</span>}
                              {isSelected && <Check className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-slate-800 p-0.5 text-white" />}
                              {color.mode === 'background' && color.hex.toUpperCase() !== '#FFFFFF' && (
                                <span className="absolute inset-x-0 bottom-0.5 text-center text-[8px] font-black" style={{ color: readableTextColor(color.hex) }} />
                              )}
                            </button>
                            <button
                              type="button"
                              aria-label={`ลบสี ${color.hex}`}
                              title="ลบสีนี้ออกจากลิสต์"
                              onClick={() => removeSavedColor(index)}
                              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 place-items-center rounded-full bg-rose-500 text-white shadow group-hover:grid"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                            {color.mode === 'text' && <span className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-sm bg-sky-600 px-1 text-[8px] font-black text-white">A</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="my-3 border-t border-slate-100" />

                  {/* Add new color */}
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">เพิ่มสีใหม่</p>
                  <div className="space-y-2 rounded-xl bg-slate-50 p-2.5">
                    <div className="flex items-center gap-2">
                      <input type="color" value={/^#[\da-fA-F]{6}$/.test(newColorHex) ? newColorHex : '#FEF08A'} onChange={(event) => setNewColorHex(event.target.value.toUpperCase())} className="h-9 w-12 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <input type="text" value={newColorHex} onChange={(event) => { const value = event.target.value; if (/^#[0-9a-fA-F]{0,8}$/.test(value)) setNewColorHex(value.toUpperCase()); }} placeholder="#FFB6C1" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setNewColorMode('background')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition-colors ${newColorMode === 'background' ? 'border-slate-800 bg-white text-slate-800' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}>
                        <span className="h-4 w-4 rounded border border-slate-300" style={{ background: newColorHex }} /> พื้นหลัง
                      </button>
                      <button type="button" onClick={() => setNewColorMode('text')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition-colors ${newColorMode === 'text' ? 'border-slate-800 bg-white text-slate-800' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}>
                        <span className="grid h-4 w-4 place-items-center rounded border border-slate-300 bg-white text-[10px] font-black" style={{ color: newColorHex }}>A</span> ตัวอักษร
                      </button>
                    </div>
                    <button type="button" onClick={addSavedColor} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-700">
                      <Plus className="h-3.5 w-3.5" /> เพิ่มสีนี้ลงลิสต์ (ระบบจำไว้ให้)
                    </button>
                  </div>

                  {/* Live preview */}
                  <div className="mt-3 rounded-xl border border-slate-100 bg-[#F7F7F7] p-2.5">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">ตัวอย่างสีที่กำลังเลือก</p>
                    <RichText text={`==${highlightDirective};ข้อความที่ถูกไฮไลต์==`} as="span" className="text-sm text-slate-800" />
                  </div>
                </div>
              </>
            )}
          </div>
          <code className="ml-auto rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">=={highlightDirective};ข้อความ==</code>
        </div>

        {/* ============ SECTION CARDS ============ */}
        <div className="space-y-4">
          {sections.map((section, si) => (
            <div key={si} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
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
                  <button type="button" onClick={() => moveSection(si, 'up')} disabled={si === 0} aria-label="เลื่อน Section ขึ้น" className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveSection(si, 'down')} disabled={si === sections.length - 1} aria-label="เลื่อน Section ลง" className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => removeSection(si)} disabled={sections.length === 1} aria-label="ลบ Section" className="rounded-md p-1.5 text-slate-300 hover:bg-white hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end gap-1">
                  <input
                    type="text"
                    placeholder={section.type === 'importantNote' ? 'หัวข้อ เช่น ทริคสำคัญ' : section.type === 'practice' ? 'Header เช่น ลองทำโจทย์เพื่อทบทวนความเข้าใจ' : 'Header ของ Card (ไม่บังคับ)'}
                    value={section.heading}
                    onChange={(event) => updateSection(si, { heading: event.target.value })}
                    data-highlight-field={`${si}-heading`}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <HighlightFieldToggle fieldKey={`${si}-heading`} marker="**" onApply={(value) => updateSection(si, { heading: value })} />
                  <HighlightFieldToggle fieldKey={`${si}-heading`} marker={highlightDirective} onApply={(value) => updateSection(si, { heading: value })} />
                </div>

                {(section.type === 'detailedRule' || section.type === 'importantNote') && (
                  <div className="flex items-end gap-1">
                    <textarea
                      placeholder={section.type === 'importantNote' ? 'สรุปจุดสำคัญ รองรับ **ตัวหนา** / ==ไฮไลต์คำสำคัญ==' : 'คำอธิบายหลักการ รองรับ **ตัวหนา** / ==ไฮไลต์=='}
                      value={section.body}
                      onChange={(event) => updateSection(si, { body: event.target.value })}
                      rows={section.type === 'importantNote' ? 2 : 3}
                      className={`w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${section.type === 'importantNote' ? 'border-amber-200 bg-amber-50/50 focus:ring-amber-400' : 'border-slate-200 focus:ring-sky-400'}`}
                      data-highlight-field={`${si}-body`}
                    />
                    <HighlightFieldToggle fieldKey={`${si}-body`} marker="**" onApply={(value) => updateSection(si, { body: value })} />
                    <HighlightFieldToggle fieldKey={`${si}-body`} marker={highlightDirective} onApply={(value) => updateSection(si, { body: value })} />
                  </div>
                )}

                {(section.type === 'rule' || section.type === 'detailedRule') && (
                  <>
                    {section.type === 'rule' && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex flex-col gap-1">
                          <input type="text" placeholder="ป้ายกฎ เช่น Does / Did" value={section.chip} onChange={(event) => updateSection(si, { chip: event.target.value })} data-highlight-field={`${si}-chip`} className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-56" />
                          <div className="flex gap-2">
                            <HighlightFieldToggle fieldKey={`${si}-chip`} marker="**" onApply={(value) => updateSection(si, { chip: value })} />
                            <HighlightFieldToggle fieldKey={`${si}-chip`} marker={highlightDirective} onApply={(value) => updateSection(si, { chip: value })} />
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <input type="text" placeholder="อธิบายกฎสั้น ๆ ข้างป้าย" value={section.description} onChange={(event) => updateSection(si, { description: event.target.value })} data-highlight-field={`${si}-desc`} className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400" />
                          <div className="flex gap-2">
                            <HighlightFieldToggle fieldKey={`${si}-desc`} marker="**" onApply={(value) => updateSection(si, { description: value })} />
                            <HighlightFieldToggle fieldKey={`${si}-desc`} marker={highlightDirective} onApply={(value) => updateSection(si, { description: value })} />
                          </div>
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
                          <div className="min-w-0 flex-1 space-y-1">
                            <input type="text" placeholder="กฎ / เงื่อนไข" value={row.left} onChange={(event) => updateRow(si, ri, { left: event.target.value })} data-highlight-field={`${si}-row-${ri}-left`} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                            <div className="flex gap-2">
                              <HighlightFieldToggle fieldKey={`${si}-row-${ri}-left`} marker="**" onApply={(value) => updateRow(si, ri, { left: value })} />
                              <HighlightFieldToggle fieldKey={`${si}-row-${ri}-left`} marker={highlightDirective} onApply={(value) => updateRow(si, ri, { left: value })} />
                            </div>
                            <input type="text" placeholder="ตัวอย่างหรือผลลัพธ์ (ไม่บังคับ)" value={row.right} onChange={(event) => updateRow(si, ri, { right: event.target.value })} data-highlight-field={`${si}-row-${ri}-right`} className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            <div className="flex gap-2">
                              <HighlightFieldToggle fieldKey={`${si}-row-${ri}-right`} marker="**" onApply={(value) => updateRow(si, ri, { right: value })} />
                              <HighlightFieldToggle fieldKey={`${si}-row-${ri}-right`} marker={highlightDirective} onApply={(value) => updateRow(si, ri, { right: value })} />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button type="button" onClick={() => moveRow(si, ri, 'up')} disabled={ri === 0} aria-label="เลื่อนแถวขึ้น" className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => moveRow(si, ri, 'down')} disabled={ri === section.rows.length - 1} aria-label="เลื่อนแถวลง" className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => removeRow(si, ri)} aria-label="ลบแถว" className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => addRow(si)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"><Plus className="h-3.5 w-3.5" /> เพิ่มแถวคำอธิบาย → ตัวอย่าง</button>
                    </div>
                    {section.type === 'rule' && (
                      <div className="space-y-2 rounded-xl border border-slate-100 p-3">
                        <p className="text-xs font-bold text-slate-600">Example Cards</p>
                        {section.examples.map((example, ei) => (
                          <div key={ei} className="grid gap-2 rounded-xl bg-slate-50 p-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
                            <div className="space-y-0.5"><input placeholder="ประโยคตัวอย่าง" value={example.en} onChange={(event) => updateExample(si, ei, { en: event.target.value })} data-highlight-field={`${si}-example-${ei}-en`} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /><div className="flex gap-2"><HighlightFieldToggle fieldKey={`${si}-example-${ei}-en`} marker="**" onApply={(value) => updateExample(si, ei, { en: value })} /><HighlightFieldToggle fieldKey={`${si}-example-${ei}-en`} marker={highlightDirective} onApply={(value) => updateExample(si, ei, { en: value })} /></div></div>
                            <div className="space-y-0.5"><input placeholder="คำแปล/คำอธิบาย (ไม่บังคับ)" value={example.th} onChange={(event) => updateExample(si, ei, { th: event.target.value })} data-highlight-field={`${si}-example-${ei}-th`} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /><div className="flex gap-2"><HighlightFieldToggle fieldKey={`${si}-example-${ei}-th`} marker="**" onApply={(value) => updateExample(si, ei, { th: value })} /><HighlightFieldToggle fieldKey={`${si}-example-${ei}-th`} marker={highlightDirective} onApply={(value) => updateExample(si, ei, { th: value })} /></div></div>
                            <select aria-label={`สถานะตัวอย่าง ${ei + 1}`} value={example.ok ? 'correct' : 'incorrect'} onChange={(event) => updateExample(si, ei, { ok: event.target.value === 'correct' })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"><option value="correct">ถูก</option><option value="incorrect">ไม่ถูก</option></select>
                            <button type="button" onClick={() => removeExample(si, ei)} aria-label="ลบตัวอย่าง" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addExample(si)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"><Plus className="size-3.5" /> เพิ่ม Example Card</button>
                      </div>
                    )}
                    {section.type === 'rule' && (
                      <div className="flex items-end gap-1">
                        <input type="text" placeholder="Summary / Tip ด้านล่าง (ไม่บังคับ) รองรับ ==ไฮไลต์==" value={section.tip} onChange={(event) => updateSection(si, { tip: event.target.value })} data-highlight-field={`${si}-tip`} className="w-full rounded-xl border border-sky-200 bg-sky-50/40 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
                        <div className="flex gap-2">
                          <HighlightFieldToggle fieldKey={`${si}-tip`} marker="**" onApply={(value) => updateSection(si, { tip: value })} />
                          <HighlightFieldToggle fieldKey={`${si}-tip`} marker={highlightDirective} onApply={(value) => updateSection(si, { tip: value })} />
                        </div>
                      </div>
                    )}
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
                        {question.options.map((option, oi) => <div key={oi} className="flex gap-2"><input placeholder={`ตัวเลือก ${oi + 1}`} value={option} onChange={(event) => updatePracticeOption(si, qi, oi, event.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm" /><label className="flex items-center gap-1 text-xs text-slate-600"><input type="radio" name={`practice-answer-${si}-${qi}`} checked={question.answerIndex === oi} onChange={() => updatePractice(si, qi, { answerIndex: oi })} /> เฉลย</label><button type="button" onClick={() => removePracticeOption(si, qi, oi)} disabled={question.options.length <= 2} aria-label="ลบตัวเลือก" className="rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="size-4" /></button></div>)}
                        <button type="button" onClick={() => addPracticeOption(si, qi)} className="text-xs font-semibold text-emerald-700">+ เพิ่มตัวเลือก</button>
                        <textarea placeholder="คำอธิบายหลังตอบ (ไม่บังคับ)" value={question.explanation} onChange={(event) => updatePractice(si, qi, { explanation: event.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm" />
                      </div>
                    ))}
                    <button type="button" onClick={() => addPracticeQuestion(si)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><Plus className="size-3.5" /> เพิ่มโจทย์ใน Mini Quiz</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-center">
            <label className="group inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-sky-400 hover:bg-sky-50/40 hover:text-sky-700">
              <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-sky-100 group-hover:text-sky-600">
                <Plus className="h-3.5 w-3.5" />
              </span> เพิ่ม Section
              <select
                aria-label="เลือกรูปแบบ Section ใหม่"
                value=""
                onChange={(event) => {
                  if (event.target.value) addSection(event.target.value as SectionType);
                }}
                className="max-w-36 cursor-pointer bg-transparent text-sm font-bold outline-none"
              >
                <option value="" disabled>เลือกรูปแบบ…</option>
                <option value="rule">Rule / Grammar Card</option>
                <option value="detailedRule">Rule / Grammar แบบละเอียด</option>
                <option value="importantNote">Important Note / Key Point</option>
                <option value="practice">Mini Quiz / Practice</option>
              </select>
            </label>
          </div>
        </div>

        {/* Preview */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="font-extrabold text-slate-800">พรีวิวหน้าผู้เรียน</h2><p className="text-xs text-slate-400">แสดงการ์ดแบบเดียวกับหน้า explain ของผู้เรียน</p></div><Eye className="h-4 w-4 text-sky-600" /></div>
          <div className="min-h-[400px] bg-[#F7F7F7] p-3 sm:p-5">
            {parsedSections.length ? (
              <>
                <div className="mb-3 rounded-xl bg-white px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">{grammarTopic || 'grammarTopic'}</p><h3 className="font-extrabold text-slate-800">{title || 'ชื่อเนื้อหา'}</h3>{intro && <p className="mt-1 text-sm text-slate-500">{intro}</p>}</div>
                <ReviewContent title={title} topics={parsedSections as LessonSection[]} tip={tip || undefined} />
                <div className="mt-3 rounded-xl bg-white p-4"><p className="mb-2 text-xs font-bold text-slate-500">ตัวอย่างไฮไลต์/ตัวหนา</p><RichText text="==yellow;ตัวอย่างเหลือง== · ==green;ตัวอย่างเขียว== · ==blue;ตัวอย่างฟ้า== · **ตัวหนา**" as="span" /></div>
              </>
            ) : <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-400">เพิ่ม Section และกรอกเนื้อหาเพื่อดูตัวอย่างเนื้อหา</div>}
          </div>
        </section>

        {/* Bottom actions */}
        <div className="mb-8 mt-6 flex items-center justify-between">
          <Link href="/admin/test-explains" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /> ยกเลิก</Link>
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </div>
    </div>
  );
}
