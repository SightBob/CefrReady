'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Loader2, Check, X, FileText, HelpCircle,
  ChevronUp, ChevronDown, Lightbulb, Sparkles, BookOpen, AlertTriangle,
} from 'lucide-react';

// ============================================================
// Types (mirror lesson_pages JSONB shapes)
// ============================================================

interface ExampleRow {
  en: string;
  th: string;
  ok: boolean;
}

interface TableData {
  headers: string[];
  rows: string[][];
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

interface SectionRow {
  heading: string;
  body: string;
  examples: ExampleRow[];
  table: TableData | null;
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
  sections: SectionRow[];
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

const emptySection = (): SectionRow => ({ heading: '', body: '', examples: [], table: null, tap: null });
const emptyTapItem = (): TapItem => ({ prompt: '', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 });
const emptyExample = (): ExampleRow => ({ en: '', th: '', ok: true });

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
  const [pageType, setPageType] = useState<'explain' | 'quiz'>(initial?.pageType === 'quiz' ? 'quiz' : 'explain');
  const [sections, setSections] = useState<SectionRow[]>(
    initial?.sections?.length
      ? initial.sections.map((s) => ({
          heading: s.heading,
          body: s.body,
          examples: s.examples ?? [],
          table: (s as { table?: TableData | null }).table ?? null,
          tap: (s as { tap?: TapExercise | null }).tap ?? null,
        }))
      : [emptySection()]
  );
  const [quiz, setQuiz] = useState<QuizRow[]>(() => toQuizRows(initial?.quiz ?? null));
  const [vocab, setVocab] = useState<VocabBankDraft>(() => toVocabDraft(initial?.vocabBank ?? null));
  const [tip, setTip] = useState(initial?.tip ?? '');
  const [intro, setIntro] = useState(initial?.intro ?? '');
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [saving, setSaving] = useState(false);

  // ---------- Sections ----------
  const updateSection = (i: number, patch: Partial<SectionRow>) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));

  const addSection = () => setSections((s) => [...s, emptySection()]);
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));
  const moveSection = (i: number, dir: 'up' | 'down') =>
    setSections((s) => {
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  // ---------- Examples within a section ----------
  const updateExample = (si: number, ei: number, patch: Partial<ExampleRow>) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si
          ? { ...sec, examples: sec.examples.map((ex, i2) => (i2 === ei ? { ...ex, ...patch } : ex)) }
          : sec
      )
    );

  const addExample = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) => (idx === si ? { ...sec, examples: [...sec.examples, emptyExample()] } : sec))
    );

  const removeExample = (si: number, ei: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si ? { ...sec, examples: sec.examples.filter((_, i2) => i2 !== ei) } : sec
      )
    );

  // ---------- Table within a section ----------
  const addTable = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si
          ? { ...sec, table: { headers: ['', ''], rows: [['', ''], ['', '']] } }
          : sec
      )
    );

  const removeTable = (si: number) =>
    setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, table: null } : sec)));

  const updateHeader = (si: number, ci: number, value: string) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si || !sec.table) return sec;
        return { ...sec, table: { ...sec.table, headers: sec.table.headers.map((h, i) => (i === ci ? value : h)) } };
      })
    );

  const updateCell = (si: number, ri: number, ci: number, value: string) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si || !sec.table) return sec;
        return {
          ...sec,
          table: {
            ...sec.table,
            rows: sec.table.rows.map((row, r) => (r === ri ? row.map((c, i) => (i === ci ? value : c)) : row)),
          },
        };
      })
    );

  const addTableRow = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si || !sec.table) return sec;
        return { ...sec, table: { ...sec.table, rows: [...sec.table.rows, sec.table.headers.map(() => '')] } };
      })
    );

  const removeTableRow = (si: number, ri: number) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si || !sec.table) return sec;
        return { ...sec, table: { ...sec.table, rows: sec.table.rows.filter((_, r) => r !== ri) } };
      })
    );

  const addTableColumn = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si || !sec.table) return sec;
        return {
          ...sec,
          table: {
            headers: [...sec.table.headers, ''],
            rows: sec.table.rows.map((row) => [...row, '']),
          },
        };
      })
    );

  const removeTableColumn = (si: number, ci: number) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si || !sec.table) return sec;
        if (sec.table.headers.length <= 1) return sec;
        return {
          ...sec,
          table: {
            headers: sec.table.headers.filter((_, i) => i !== ci),
            rows: sec.table.rows.map((row) => row.filter((_, i) => i !== ci)),
          },
        };
      })
    );

  // ---------- Tap & Select exercise within a section ----------
  const addTap = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si
          ? {
              ...sec,
              tap: {
                title: 'แตะเลือกว่าประโยคนี้ถูกหรือผิด',
                items: [
                  { prompt: '', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 },
                  { prompt: '', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 },
                ],
              },
            }
          : sec
      )
    );

  const removeTap = (si: number) =>
    setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, tap: null } : sec)));

  const updateTap = (si: number, patch: Partial<Omit<TapExercise, 'items'>>) =>
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

  const addTapItem = (si: number) =>
    setSections((s) =>
      s.map((sec, idx) => (idx === si && sec.tap ? { ...sec, tap: { ...sec.tap, items: [...sec.tap.items, emptyTapItem()] } } : sec))
    );

  const removeTapItem = (si: number, ii: number) =>
    setSections((s) =>
      s.map((sec, idx) =>
        idx === si && sec.tap
          ? { ...sec, tap: { ...sec.tap, items: sec.tap.items.filter((_, i2) => i2 !== ii) } }
          : sec
      )
    );

  // ---------- Quiz ----------
  const updateQuiz = (qi: number, patch: Partial<QuizRow>) =>
    setQuiz((items) => items.map((item, i) => (i === qi ? { ...item, ...patch } : item)));

  const updateQuizOption = (qi: number, oi: number, value: string) =>
    setQuiz((items) => items.map((item, i) => i === qi
      ? { ...item, options: item.options.map((option, index) => index === oi ? value : option) }
      : item
    ));

  const addQuizQuestion = () =>
    setQuiz((items) => [...items, { sentence: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }]);

  const removeQuizQuestion = (qi: number) =>
    setQuiz((items) => items.length <= 1 ? items : items.filter((_, i) => i !== qi));

  const addOption = (qi: number) =>
    setQuiz((items) => items.map((item, i) => i === qi ? { ...item, options: [...item.options, ''] } : item));

  const removeOption = (qi: number, oi: number) =>
    setQuiz((items) => items.map((item, i) => {
      if (i !== qi || item.options.length <= 2) return item;
      return {
        ...item,
        options: item.options.filter((_, index) => index !== oi),
        answerIndex: item.answerIndex >= oi && item.answerIndex > 0 ? item.answerIndex - 1 : item.answerIndex,
      };
    }));

  // ---------- Vocab bank (flexible columns) ----------
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

  // ---------- Save ----------
  const validationWarnings = pageType === 'explain'
    ? sections.flatMap((section, sectionIndex) => {
        const warnings: string[] = [];
        const hasSectionText = section.heading.trim() || section.body.trim();
        if (hasSectionText && (!section.heading.trim() || !section.body.trim())) {
          warnings.push(`หัวข้อที่ ${sectionIndex + 1} ต้องมีทั้งชื่อและคำอธิบาย`);
        }
        if (section.tap) {
          if (section.tap.items.length === 0) {
            warnings.push(`หัวข้อที่ ${sectionIndex + 1} ยังไม่มีโจทย์ Tap & Select`);
          } else {
            section.tap.items.forEach((item, itemIndex) => {
              if (!item.prompt.trim() || !item.choiceA.trim() || !item.choiceB.trim()) {
                warnings.push(`Tap & Select ข้อที่ ${itemIndex + 1} ต้องมีโจทย์และตัวเลือก A/B ครบ`);
              }
            });
          }
        }
        return warnings;
      })
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
      const valid = sections.filter((s) => s.heading.trim() || s.body.trim());
      if (valid.length === 0) {
        toast.error('ต้องมีอย่างน้อย 1 หัวข้อพร้อมเนื้อหา');
        return;
      }
      for (const s of valid) {
        if (!s.heading.trim() || !s.body.trim()) {
          toast.error('ทุกหัวข้อต้องมีทั้งชื่อหัวข้อและเนื้อหา');
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
              sections: sections
                .filter((s) => s.heading.trim() || s.body.trim())
                .map((s) => ({
                  heading: s.heading.trim(),
                  body: s.body.trim(),
                  examples: s.examples.length > 0 ? s.examples : undefined,
                  table:
                    s.table &&
                    s.table.headers.some((h) => h.trim()) &&
                    s.table.rows.some((row) => row.some((c) => c.trim()))
                      ? {
                          headers: s.table.headers.map((h) => h.trim()),
                          rows: s.table.rows.map((row) => row.map((c) => c.trim())),
                        }
                      : undefined,
                  tap:
                    s.tap &&
                    s.tap.items.some((it) => it.prompt.trim() && it.choiceA.trim() && it.choiceB.trim())
                      ? {
                          title: s.tap.title.trim() || 'แตะเลือกคำตอบที่ถูกต้อง',
                          items: s.tap.items
                            .filter((it) => it.prompt.trim() && it.choiceA.trim() && it.choiceB.trim())
                            .map((it) => ({
                              prompt: it.prompt.trim(),
                              choiceA: it.choiceA.trim(),
                              choiceB: it.choiceB.trim(),
                              correct: it.correct,
                            })),
                        }
                      : undefined,
                })),
              vocabBank:
                vocab.rows.filter((r) => r.cells.some((c) => c.trim())).length > 0
                  ? {
                      columns: vocab.columns.map((c) => c.trim() || 'คอลัมน์'),
                      rows: vocab.rows
                        .filter((r) => r.cells.some((c) => c.trim()))
                        .map((r) => r.cells.map((c) => c.trim())),
                    }
                  : null,
              tip: tip.trim() || null,
              intro: intro.trim() || null,
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
        toast.error(j?.error ?? 'บันทึกไม่สำเร็จ');
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {pageId ? 'บันทึก' : 'สร้างหน้า'}
          </button>
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
          <div className="flex gap-2">
            <button
              onClick={() => setPageType('explain')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${pageType === 'explain' ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4" /> เนื้อหาอธิบาย
            </button>
            <button
              onClick={() => setPageType('quiz')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${pageType === 'quiz' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
            >
              <HelpCircle className="w-4 h-4" /> คำถาม (Quiz)
            </button>
          </div>
        </div>

        {/* ============ EXPLAIN PAGE ============ */}
        {pageType === 'explain' && (
          <div className="space-y-4">
            {sections.map((section, si) => (
              <div key={si} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">หัวข้อที่ {si + 1}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSection(si, 'up')} disabled={si === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => moveSection(si, 'down')} disabled={si === sections.length - 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => removeSection(si)} disabled={sections.length === 1} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="ชื่อหัวข้อ เช่น 1. ประธานเอกพจน์ → กริยาเติม s/es"
                  value={section.heading}
                  onChange={(e) => updateSection(si, { heading: e.target.value })}
                  className="w-full mb-2.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                {/* Mini formatting toolbar for the body text */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mr-1">จัดรูปแบบ:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      const ta = (e.currentTarget.closest('div')?.parentElement?.querySelector(`[data-body-ta="${si}"]`) ?? null) as HTMLTextAreaElement | null;
                      if (!ta) return;
                      const { value, caret } = wrapSelection(ta, '**');
                      updateSection(si, { body: value });
                      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caret, caret); });
                    }}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-xs font-extrabold text-slate-600 hover:border-sky-300 hover:text-sky-600"
                    title="ตัวหนา — ล้อมข้อความที่เลือกด้วย ** **"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const ta = (e.currentTarget.closest('div')?.parentElement?.querySelector(`[data-body-ta="${si}"]`) ?? null) as HTMLTextAreaElement | null;
                      if (!ta) return;
                      const { value, caret } = wrapSelection(ta, '==');
                      updateSection(si, { body: value });
                      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caret, caret); });
                    }}
                    className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-amber-600 bg-amber-50 hover:border-amber-300"
                    title="ไฮไลต์ — ล้อมข้อความที่เลือกด้วย == =="
                  >
                    ไฮไลต์
                  </button>
                  <span className="text-[10px] text-slate-300">หรือพิมพ์ **ตัวหนา** / ==ไฮไลต์== ได้โดยตรง</span>
                </div>
                <textarea
                  data-body-ta={si}
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับ Grammar หัวข้อนี้"
                  value={section.body}
                  onChange={(e) => updateSection(si, { body: e.target.value })}
                  rows={3}
                  className="w-full mb-4 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y"
                />

                {/* Table editor */}
                {section.table ? (
                  <div className="bg-indigo-50/60 rounded-xl p-3.5 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-500">ตาราง</p>
                      <button
                        onClick={() => removeTable(si)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> ลบตาราง
                      </button>
                    </div>

                    {/* Header row */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {section.table.headers.map((h, ci) => (
                        <div key={ci} className="flex-1 min-w-0 relative">
                          <input
                            type="text"
                            placeholder={`หัวคอลัมน์ ${ci + 1}`}
                            value={h}
                            onChange={(e) => updateHeader(si, ci, e.target.value)}
                            className="w-full pl-2.5 pr-6 py-1.5 border-2 border-indigo-300 rounded-lg text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          {section.table!.headers.length > 1 && (
                            <button
                              onClick={() => removeTableColumn(si, ci)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded text-indigo-300 hover:text-rose-500"
                              title="ลบคอลัมน์นี้"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      {section.table.headers.length < 5 && (
                        <button
                          onClick={() => addTableColumn(si)}
                          className="shrink-0 w-8 h-8 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-400 hover:text-indigo-600 hover:border-indigo-400 flex items-center justify-center"
                          title="เพิ่มคอลัมน์"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Data rows */}
                    {section.table.rows.map((row, ri) => (
                      <div key={ri} className="flex items-center gap-1.5 mb-1.5">
                        {row.map((cell, ci) => (
                          <input
                            key={ci}
                            type="text"
                            placeholder={ci === 0 ? 'แถวนี้…' : ''}
                            value={cell}
                            onChange={(e) => updateCell(si, ri, ci, e.target.value)}
                            className={`flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${ci === 0 ? 'font-semibold bg-white' : ''}`}
                          />
                        ))}
                        <button
                          onClick={() => removeTableRow(si, ri)}
                          className="shrink-0 p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                          title="ลบแถวนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTableRow(si)}
                      className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มแถว
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addTable(si)}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มตาราง
                  </button>
                )}

                {/* Examples */}
                <div className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">ตัวอย่างประโยค</p>
                  <div className="space-y-2">
                    {section.examples.map((ex, ei) => (
                      <div key={ei} className="flex items-start gap-2 bg-white rounded-lg border border-slate-100 p-2.5">
                        <button
                          onClick={() => updateExample(si, ei, { ok: !ex.ok })}
                          className={`mt-1 w-5 h-5 rounded-full shrink-0 text-[10px] font-black flex items-center justify-center transition-colors ${ex.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}
                          title={ex.ok ? 'ถูก (กดเพื่อเปลี่ยนเป็นผิด)' : 'ผิด (กดเพื่อเปลี่ยนเป็นถูก)'}
                        >
                          {ex.ok ? '✓' : '✗'}
                        </button>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="ประโยคภาษาอังกฤษ"
                            value={ex.en}
                            onChange={(e) => updateExample(si, ei, { en: e.target.value })}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                          <input
                            type="text"
                            placeholder="คำแปล/คำอธิบาย"
                            value={ex.th}
                            onChange={(e) => updateExample(si, ei, { th: e.target.value })}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                        <button onClick={() => removeExample(si, ei)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addExample(si)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 px-2.5 py-1.5 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มตัวอย่าง
                  </button>
                </div>

                {/* Tap & Select — ฝึกแยกถูก/ผิด */}
                {section.tap ? (
                  <div className="bg-teal-50/60 rounded-xl p-3.5 mt-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-teal-600">Tap & Select — ฝึกแยกถูก/ผิด</p>
                      <button
                        onClick={() => removeTap(si)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> ลบแบบฝึก
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="ชื่อคำสั่ง เช่น แตะเลือกว่าประโยคนี้ถูกหรือผิด"
                      value={section.tap.title}
                      onChange={(e) => updateTap(si, { title: e.target.value })}
                      className="w-full mb-2 px-2.5 py-1.5 border border-teal-200 bg-white rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />

                    {/* Items — each with its own prompt + 2 editable choices */}
                    <div className="space-y-2">
                      {section.tap.items.map((it, ii) => (
                        <div key={ii} className="bg-white rounded-lg border border-teal-100 p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-teal-500 shrink-0 w-5 text-center">{ii + 1}</span>
                            <input
                              type="text"
                              placeholder="โจทย์ เช่น She work at a bank."
                              value={it.prompt}
                              onChange={(e) => updateTapItem(si, ii, { prompt: e.target.value })}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                            <button onClick={() => removeTapItem(si, ii)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 shrink-0" title="ลบโจทย์นี้"><Trash2 className="w-3.5 h-3.5" /></button>
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
                                    onChange={(e) => updateTapItem(si, ii, isA ? { choiceA: e.target.value } : { choiceB: e.target.value })}
                                    className="flex-1 min-w-0 px-2 py-1.5 border border-teal-200 bg-teal-50/40 rounded-lg text-xs font-bold text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateTapItem(si, ii, { correct: (isA ? 0 : 1) as 0 | 1 })}
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
                    <button onClick={() => addTapItem(si)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg">
                      <Plus className="w-3.5 h-3.5" /> เพิ่มโจทย์
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5">แต่ละโจทย์มี 2 ตัวเลือกของตัวเอง — แก้ไขข้อความได้ และกด A/B เพื่อกำหนดคำตอบที่ถูก</p>
                  </div>
                ) : (
                  <button
                    onClick={() => addTap(si)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg border border-dashed border-teal-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่ม Tap & Select (ฝึกแยกถูก/ผิด)
                  </button>
                )}
              </div>
            ))}

            <button onClick={addSection} className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:text-sky-600 hover:border-sky-300 transition-colors">
              <Plus className="w-4 h-4" /> เพิ่มหัวข้อ
            </button>

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
              </div>
            </div>

            {/* Intro — "จำไว้เลย" summary (optional) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-emerald-500" /> จำไว้เลย (ไม่บังคับ)
              </p>
              <p className="text-xs text-slate-400 mb-3">กล่องสรุปสั้นด้านบนของหน้าเนื้อหา — เว้นว่างถ้าไม่ต้องการแสดง</p>
              <textarea
                placeholder="เช่น หลักการพื้นฐานคือ กริยาต้องเปลี่ยนรูปตามประธาน…"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
              />
            </div>

            {/* Tip */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" /> เคล็ดลับ (ไม่บังคับ)
              </p>
              <textarea
                placeholder="เทคนิคจำ เช่น เอกพจน์เติม s — พหูพจน์ไม่เติม s"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-y"
              />
            </div>
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
    </div>
  );
}
