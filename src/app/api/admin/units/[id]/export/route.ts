import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/units/[id]/export — download ONE unit as JSON.
 *
 * Same shape as the full-path export (version 1, ids excluded) but with
 * `units` containing just this unit — so the file imports through the
 * exact same import endpoint (merge appends it, replace wipes first).
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = await props.params;
  const unitId = parseInt(params.id);
  if (isNaN(unitId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    const [unit] = await db
      .select()
      .from(learningUnits)
      .where(eq(learningUnits.id, unitId))
      .limit(1);
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    const nodes = await db
      .select()
      .from(learningNodes)
      .where(eq(learningNodes.unitId, unitId))
      .orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));

    const pages = await db
      .select()
      .from(lessonPages)
      .orderBy(asc(lessonPages.nodeId), asc(lessonPages.orderIndex), asc(lessonPages.id));

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      units: [
        {
          title: unit.title,
          subtitle: unit.subtitle,
          colorKey: unit.colorKey,
          orderIndex: unit.orderIndex,
          isPublished: unit.isPublished,
          nodes: nodes.map((n) => ({
            title: n.title,
            kind: n.kind,
            orderIndex: n.orderIndex,
            isPublished: n.isPublished,
            pages: pages
              .filter((p) => p.nodeId === n.id)
              .map((p) => ({
                pageType: p.pageType,
                sections: p.sections,
                quiz: p.quiz,
                vocabBank: p.vocabBank,
                tip: p.tip,
                intro: p.intro,
                orderIndex: p.orderIndex,
              })),
          })),
        },
      ],
    };

    const safeName = unit.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || `unit-${unitId}`;
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="unit-${safeName}-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[admin/units/id/export] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to export unit' }, { status: 500 });
  }
}
