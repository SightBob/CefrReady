import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type NodeStat = { id: number; title: string; questions: number; hasContent: boolean; hasTap: boolean };
type UnitStat = { id: number; title: string; isPublished: boolean; nodes: NodeStat[]; nodeCount: number; questionCount: number; incompleteNodes: number };

function quizCount(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const quiz = value as { questions?: unknown[]; sentence?: unknown };
  return Array.isArray(quiz.questions) ? quiz.questions.length : quiz.sentence ? 1 : 0;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const units = await db.select().from(learningUnits).orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));
    const nodes = await db.select().from(learningNodes).orderBy(asc(learningNodes.unitId), asc(learningNodes.orderIndex), asc(learningNodes.id));
    const pages = await db.select().from(lessonPages);

    const unitStats: UnitStat[] = units.map((unit) => {
      const unitNodes = nodes.filter((node) => node.unitId === unit.id);
      const nodeStats: NodeStat[] = unitNodes.map((node) => {
        const nodePages = pages.filter((page) => page.nodeId === node.id);
        const explain = nodePages.find((page) => page.pageType === 'explain');
        const quiz = nodePages.filter((page) => page.pageType === 'quiz').reduce((sum, page) => sum + quizCount(page.quiz), 0);
        const sections = explain?.sections ?? [];
        const hasTap = sections.some((section) => Boolean(section.tap?.items?.length));
        const hasContent = sections.length > 0 || Boolean(explain?.intro);
        return { id: node.id, title: node.title, questions: quiz, hasContent, hasTap };
      });
      return {
        id: unit.id,
        title: unit.title,
        isPublished: unit.isPublished,
        nodes: nodeStats,
        nodeCount: nodeStats.length,
        questionCount: nodeStats.reduce((sum, node) => sum + node.questions, 0),
        incompleteNodes: nodeStats.filter((node) => !node.hasContent || node.questions === 0 || !node.hasTap).length,
      };
    });

    const allNodes = unitStats.flatMap((unit) => unit.nodes);
    return NextResponse.json({
      success: true,
      data: {
        units: unitStats,
        totals: {
          units: units.length,
          nodes: nodes.length,
          pages: pages.length,
          explainPages: pages.filter((page) => page.pageType === 'explain').length,
          quizPages: pages.filter((page) => page.pageType === 'quiz').length,
          questions: allNodes.reduce((sum, node) => sum + node.questions, 0),
          incompleteNodes: allNodes.filter((node) => !node.hasContent || node.questions === 0 || !node.hasTap).length,
        },
      },
    });
  } catch (err) {
    console.error('[admin/learning-dashboard] GET error:', err);
    return NextResponse.json({ success: false, error: 'โหลดสถิติ Learning Path ไม่สำเร็จ' }, { status: 500 });
  }
}
