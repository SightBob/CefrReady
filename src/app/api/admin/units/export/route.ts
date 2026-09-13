import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/units/export — download the full learning path as JSON.
 *
 * Shape (version 1) — ids are intentionally excluded so a file can be
 * imported into any environment (merge appends, replace wipes first):
 * { version, exportedAt, units: [{ title, subtitle, colorKey, orderIndex,
 *   isPublished, nodes: [{ title, kind, orderIndex, isPublished,
 *     pages: [{ pageType, sections, quiz, vocabBank, tip, orderIndex }] }] }] }
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const units = await db
      .select()
      .from(learningUnits)
      .orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));

    const nodes = await db
      .select()
      .from(learningNodes)
      .orderBy(asc(learningNodes.unitId), asc(learningNodes.orderIndex), asc(learningNodes.id));

    const pages = await db
      .select()
      .from(lessonPages)
      .orderBy(asc(lessonPages.nodeId), asc(lessonPages.orderIndex), asc(lessonPages.id));

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      units: units.map((u) => ({
        title: u.title,
        subtitle: u.subtitle,
        colorKey: u.colorKey,
        orderIndex: u.orderIndex,
        isPublished: u.isPublished,
        nodes: nodes
          .filter((n) => n.unitId === u.id)
          .map((n) => ({
            title: n.title,
            kind: n.kind,
            orderIndex: n.orderIndex,
            isPublished: n.isPublished,
            passScore: n.passScore,
            pages: pages
              .filter((p) => p.nodeId === n.id)
              .map((p) => ({
                pageType: p.pageType,
                sections: p.sections,
                quiz: p.quiz,
                vocabBank: p.vocabBank,
                tip: p.tip,
                intro: p.intro,
                isPublished: p.isPublished,
                orderIndex: p.orderIndex,
              })),
          })),
      })),
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="learning-path-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[admin/units/export] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to export' }, { status: 500 });
  }
}
