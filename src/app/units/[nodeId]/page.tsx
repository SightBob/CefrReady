import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from '@phosphor-icons/react/dist/ssr';
import { fetchNodeLesson, fetchLearningPath, type UnitData } from '@/lib/learning-path';
import LessonContent from '@/components/LessonContent';

export const dynamic = 'force-dynamic';

const PALETTE: Record<string, { base: string; dark: string; light: string }> = {
  green: { base: '#58CC02', dark: '#46A302', light: '#D7FFB8' },
  blue: { base: '#1CB0F6', dark: '#1899D6', light: '#DDF4FF' },
  purple: { base: '#CE82FF', dark: '#A568CC', light: '#F7EFFF' },
  orange: { base: '#FF9600', dark: '#E08600', light: '#FFF1DC' },
};

function accentFor(unit: UnitData) {
  return PALETTE[unit.colorKey] ?? PALETTE.green;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}): Promise<Metadata> {
  const { nodeId } = await params;
  const id = Number(nodeId);
  if (Number.isNaN(id)) return { title: 'บทเรียน' };
  const data = await fetchNodeLesson(id).catch(() => null);
  return {
    title: data ? `${data.node.title} — เส้นทางการเรียน` : 'บทเรียน',
    description: 'เรียนรู้เนื้อหาแบบทีละขั้นจากเส้นทางการเรียน CEFR Ready',
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  const id = Number(nodeId);
  if (Number.isNaN(id)) notFound();

  const data = await fetchNodeLesson(id);
  if (!data) notFound();

  const { node, unit } = data;
  const colors = accentFor(unit);

  // Convert DB pages into the shape LessonContent expects:
  // intro = first section body of the first explain page; sections carry on.
  const explainPages = node.pages.filter((p) => p.pageType === 'explain');
  // Keep concept content and Tap & Select data from the same or separate
  // explain pages. Unit 2 stores both blocks on one page; older nodes may
  // still have a dedicated Tap page, which remains supported.
  const conceptPages = explainPages;
  const tapOnConcept = explainPages.some(
    (p) => p.orderIndex === 0 && p.sections.some((s) => Boolean(s.tap))
  );
  const sections = conceptPages.flatMap((p) =>
    p.sections
      .filter((s) => !s.tap)
      .map((s) => ({
        heading: s.heading,
        body: s.body,
        examples: s.examples,
        table: (s as { table?: { headers: string[]; rows: string[][] } }).table,
      }))
  );
  const tapExercises = explainPages.flatMap((p) =>
    p.sections
      .map((s) => (s as { tap?: { title: string; items: Array<{ prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }> } | null }).tap)
      .filter((tap): tap is { title: string; items: Array<{ prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }> } => Boolean(tap?.items?.length))
  );
  const vocabBank = explainPages.find((p) => p.vocabBank)?.vocabBank ?? null;
  const tip = explainPages.find((p) => p.tip)?.tip ?? null;
  // ALL quiz questions across every quiz page of this node, in page order —
  // the student answers them one by one and finishes explicitly.
  const questions = node.pages
    .filter((p) => p.pageType === 'quiz' && p.quiz)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((p) => p.quiz?.questions ?? []);

  // Position within the full learning path for breadcrumb and next-node navigation.
  // Prefer the next node in this unit; when the unit ends, continue with the
  // first node of the next published unit.
  const learningPath = await fetchLearningPath();
  const currentUnitIndex = learningPath.findIndex((u) => u.id === unit.id);
  const siblings = currentUnitIndex >= 0 ? learningPath[currentUnitIndex].nodes : [];
  const currentNodeIndex = siblings.findIndex((n) => n.id === node.id);
  const nextNode =
    siblings[currentNodeIndex + 1] ??
    learningPath.slice(currentUnitIndex + 1).find((u) => u.nodes.length > 0)?.nodes[0] ??
    null;
  const lesson = {
    nodeId: String(node.id),
    title: node.title,
    nextNodeId: nextNode?.id,
    nextNodeTitle: nextNode?.title,
    // "จำไว้เลย" box comes from the explain page's own intro field —
    // shown only when the admin filled it in.
    intro: explainPages.find((p) => p.intro?.trim())?.intro?.trim(),
    sections,
    tapExercises,
    tapInline: tapOnConcept,
    tip: tip ?? undefined,
    vocabBank: vocabBank ?? undefined,
    quiz: questions.length > 0 ? { questions } : undefined,
  };

  const nodeIndex = siblings.findIndex((n) => n.id === node.id) + 1;
  const totalNodes = siblings.length;
  // Unit NUMBER = position in the ordered published path (1-based), NOT the
  // DB row id — ids drift after deletes/re-imports (e.g. unit id 4 = unit 1).
  const unitNumber = (await fetchUnitNumber(unit.id)) ?? unit.id;

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pb-16 pt-[65px] max-lg:pt-[45px] min-h-svh">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/units"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="กลับไปหน้าเส้นทางการเรียน"
        >
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          เส้นทางการเรียน
        </Link>
        <span className="text-xs font-semibold text-slate-400">
          ยูนิต {unitNumber} · จุดที่ {nodeIndex}/{totalNodes}
        </span>
      </div>

      {/* Lesson header */}
      <header
        className="rounded-2xl px-6 py-6 mb-6 shadow-[0_4px_0_rgba(0,0,0,0.12)]"
        style={{ background: colors.base }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.22)' }}
          >
            <BookOpen size={18} weight="fill" color="#ffffff" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold tracking-wider uppercase text-white/80">
            บทเรียน
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{node.title}</h1>
        <p className="mt-2 text-sm sm:text-base font-medium text-white/90 leading-relaxed">
          {unit.title}
        </p>
      </header>

      {/* Content: paginated flow — explanation, quiz, result */}
      <LessonContent lesson={lesson} accent={colors} />
    </div>
  );
}

/** Sibling node ids for breadcrumb position (cheap: only nodes of one unit) */
async function fetchLearningPathForUnit(unitId: number) {
  const { fetchLearningPath } = await import('@/lib/learning-path');
  const path = await fetchLearningPath();
  return path.find((u) => u.id === unitId)?.nodes ?? [];
}

/** 1-based position of the unit within the ordered published path */
async function fetchUnitNumber(unitId: number): Promise<number | null> {
  const { fetchLearningPath } = await import('@/lib/learning-path');
  const path = await fetchLearningPath();
  const idx = path.findIndex((u) => u.id === unitId);
  return idx === -1 ? null : idx + 1;
}
