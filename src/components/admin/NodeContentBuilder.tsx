'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, HelpCircle, Loader2, PanelTop, Pencil, RotateCcw, XCircle } from 'lucide-react';
import StudentLessonContent from '@/components/LessonContent';
import type { LessonContent as StudentLesson } from '@/content/units-path-lessons';

interface PageRow {
  id: number;
  nodeId: number;
  pageType: string;
  sections: Array<{
    heading: string;
    body: string;
    headingSize?: 'sm' | 'md' | 'lg' | 'xl';
    bodySize?: 'sm' | 'md' | 'lg';
    examples?: Array<{ en: string; th: string; ok: boolean }>;
    table?: { headers: string[]; rows: string[][] };
    tap?: { title: string; items: Array<{ prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }> };
  }> | null;
  quiz: { questions?: Array<{ sentence: string; options: string[]; answerIndex: number; explanation: string }> } | null;
  intro: string | null;
  tip: string | null;
  vocabBank: StudentLesson['vocabBank'] | null;
  isPublished: boolean;
  orderIndex: number;
}

interface NodeRow {
  id: number;
  unitId: number;
  title: string;
}

interface UnitRow {
  id: number;
  title: string;
  colorKey: string;
  nodes: NodeRow[];
}

const PALETTE: Record<string, { base: string; dark: string; light: string }> = {
  green: { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
  blue: { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
  purple: { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
  orange: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
};

function getStatus(pages: PageRow[]) {
  const explain = pages.filter((page) => page.pageType === 'explain');
  const quiz = pages.filter((page) => page.pageType === 'quiz');
  const tap = pages.filter((page) => page.pageType === 'tap');
  const hasConcept = explain.some((page) => page.sections?.some((section) => section.heading.trim() && section.body.trim()) || page.intro?.trim());
  const hasTap =
    tap.some((page) => page.sections?.some((section) => section.tap?.items?.some((item) => item.prompt.trim() && item.choiceA.trim() && item.choiceB.trim()))) ||
    explain.some((page) => page.sections?.some((section) => section.tap?.items?.some((item) => item.prompt.trim() && item.choiceA.trim() && item.choiceB.trim())));
  const questionCount = quiz.reduce((count, page) => count + (page.quiz?.questions?.length ?? 0), 0);
  return { hasConcept, hasTap, hasExam: questionCount > 0, questionCount, explain, quiz, tap };
}

export default function NodeContentBuilder({ nodeId }: { nodeId: number }) {
  const [node, setNode] = useState<NodeRow | null>(null);
  const [unit, setUnit] = useState<UnitRow | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const unitsRes = await fetch('/api/admin/units');
      const unitsJson = await unitsRes.json();
      if (!unitsRes.ok || !unitsJson.success) throw new Error(unitsJson.error ?? 'โหลดข้อมูลไม่สำเร็จ');
      const foundUnit = (unitsJson.data as UnitRow[]).find((item) => item.nodes.some((child) => child.id === nodeId));
      const foundNode = foundUnit?.nodes.find((child) => child.id === nodeId) ?? null;
      if (!foundUnit || !foundNode) throw new Error('ไม่พบ Node ที่ต้องการ');
      const pagesRes = await fetch(`/api/admin/nodes/${nodeId}/pages`);
      const pagesJson = await pagesRes.json();
      if (!pagesRes.ok || !pagesJson.success) throw new Error(pagesJson.error ?? 'โหลดหน้าเนื้อหาไม่สำเร็จ');
      setUnit(foundUnit);
      setNode(foundNode);
      setPages(pagesJson.data as PageRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => { void load(); }, [load]);

  const status = useMemo(() => getStatus(pages), [pages]);
  const accent = PALETTE[unit?.colorKey ?? 'green'] ?? PALETTE.green;
  const conceptPage = status.explain[0];
  const examQuestions = status.quiz.flatMap((page) => page.quiz?.questions ?? []);
  const previewLesson: StudentLesson = {
    nodeId: String(nodeId),
    title: node?.title ?? 'ตัวอย่าง Node',
    intro: conceptPage?.intro ?? undefined,
    sections: status.explain.flatMap((page) => (page.sections ?? []).filter((section) => !section.tap)),
    tapExercises: [
      ...status.tap.flatMap((page) => (page.sections ?? []).flatMap((section) => (section.tap ? [section.tap] : []))),
      ...status.explain.flatMap((page) => (page.sections ?? []).flatMap((section) => (section.tap ? [section.tap] : []))),
    ],
    tapInline: true,
    tip: conceptPage?.tip ?? undefined,
    vocabBank: conceptPage?.vocabBank ?? undefined,
    quiz: examQuestions.length > 0 ? { questions: examQuestions } : undefined,
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  if (error || !node || !unit) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-rose-600">{error || 'ไม่พบข้อมูล'}</p>
        <Link href="/admin/units" className="text-sm font-bold text-sky-600 hover:underline">กลับไปจัดการเส้นทางการเรียน</Link>
      </div>
    );
  }

  const checklist = [
    { label: 'Concept Card', done: status.hasConcept, detail: status.explain.length ? `${status.explain.length} หน้าเนื้อหา` : 'ยังไม่มีหน้าเนื้อหา', icon: FileText },
    { label: 'Tap & Select', done: status.hasTap, detail: status.hasTap ? 'พร้อมให้ฝึก' : 'ยังไม่มีแบบฝึก', icon: PanelTop },
    { label: 'Real Exam', done: status.hasExam, detail: status.hasExam ? `${status.questionCount} ข้อสอบ` : 'ยังไม่มีข้อสอบ', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/admin/units" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-3"><ArrowLeft className="w-4 h-4" /> เส้นทางการเรียน</Link>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{unit.title}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{node.title}</h1>
            <p className="text-sm text-slate-500 mt-1">Content Builder — ดูภาพรวม แก้ไข และตรวจความพร้อมของ Node ในที่เดียว</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:border-slate-300"><RotateCcw className="w-4 h-4" /> รีเฟรช</button>
            <Link href={`/units/${node.id}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: accent.base }}><PanelTop className="w-4 h-4" /> ดูหน้าผู้เรียน</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {checklist.map(({ label, done, detail, icon: Icon }) => (
            <div key={label} className={`rounded-2xl border-2 p-4 ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </span>
                <div className="min-w-0"><p className="font-extrabold text-slate-800">{label}</p><p className={`text-xs font-semibold ${done ? 'text-emerald-700' : 'text-amber-700'}`}>{detail}</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className={`mb-6 rounded-2xl border-2 p-4 ${checklist.every((item) => item.done) ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            {checklist.every((item) => item.done)
              ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
              : <XCircle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />}
            <div>
              <p className={`text-sm font-extrabold ${checklist.every((item) => item.done) ? 'text-emerald-800' : 'text-amber-800'}`}>
                {checklist.every((item) => item.done) ? 'Node นี้พร้อมเผยแพร่' : 'Node นี้ยังไม่พร้อมเผยแพร่'}
              </p>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                ก่อนเผยแพร่ต้องมี Concept Card, Tap & Select และ Real Exam ครบ ระบบจะตรวจซ้ำอีกครั้งตอนกดเผยแพร่
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] gap-6 items-start">
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-extrabold text-slate-800">โครงสร้าง Content</h2><p className="text-xs text-slate-400 mt-1">เลือกส่วนที่ต้องการแก้ไขได้ทันที</p></div><span className="text-xs font-bold text-slate-400">{pages.length} หน้า</span></div>
              {checklist.map(({ label, done, detail, icon: Icon }, index) => {
                const page = index === 0 ? status.explain[0] : index === 1 ? status.tap[0] : status.quiz[0];
                return (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 mb-2 last:mb-0">
                    <Icon className="w-5 h-5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-extrabold text-slate-700">{label}</p><p className="text-xs text-slate-400 truncate">{detail}</p></div>
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                    {page ? <Link href={`/admin/units/pages/${page.id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs font-bold text-sky-600 hover:bg-sky-50"><Pencil className="w-3.5 h-3.5" /> แก้ไข</Link> : <Link href={`/admin/units/nodes/${node.id}/pages/new${index === 1 ? '?type=tap' : ''}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-xs font-bold text-sky-600 hover:bg-sky-50"><ChevronRight className="w-3.5 h-3.5" /> สร้าง</Link>}
                  </div>
                );
              })}
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-sm text-slate-600"><p className="font-extrabold text-sky-800 mb-1">แนะนำการทำงาน</p><p>สร้างหน้า Concept Card → สร้างหน้า Tap & Select แยกต่างหาก → สร้าง Real Exam แล้วกดดูตัวอย่างทางขวาได้เลย</p></div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3"><div><h2 className="font-extrabold text-slate-800">Preview หน้าผู้เรียน</h2><p className="text-xs text-slate-400 mt-1">ตัวอย่างจากข้อมูลล่าสุดในระบบ</p></div><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: accent.light, color: accent.dark }}>Live data</span></div>
            <div className="max-h-[760px] overflow-y-auto p-4 sm:p-6" style={{ background: '#f8fafc' }}>
              <StudentLessonContent lesson={previewLesson} accent={accent} unitTitle={unit.title} compact />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
