import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const KINDS = ['star', 'chest', 'trophy'];

/** GET /api/admin/units/[id]/nodes — nodes of one unit */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const nodes = await db
      .select()
      .from(learningNodes)
      .where(eq(learningNodes.unitId, unitId))
      .orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));
    return NextResponse.json({ success: true, data: nodes });
  } catch (err) {
    console.error('[admin/units/nodes] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch nodes' }, { status: 500 });
  }
}

/** POST /api/admin/units/[id]/nodes — create node in unit (optionally with an explain page) */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }
    const kind = KINDS.includes(body.kind) ? body.kind : 'star';

    const [unit] = await db.select().from(learningUnits).where(eq(learningUnits.id, unitId)).limit(1);
    if (!unit) return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });

    const existing = await db
      .select({ orderIndex: learningNodes.orderIndex })
      .from(learningNodes)
      .where(eq(learningNodes.unitId, unitId))
      .orderBy(asc(learningNodes.orderIndex));
    const nextOrder =
      existing.length > 0 ? (existing[existing.length - 1].orderIndex ?? 0) + 1 : 0;

    const [created] = await db
      .insert(learningNodes)
      .values({
        unitId,
        title,
        kind,
        orderIndex: nextOrder,
        isPublished: body.isPublished ?? true,
        passScore: Number.isInteger(Number(body.passScore)) && Number(body.passScore) >= 0 && Number(body.passScore) <= 100 ? Number(body.passScore) : 100,
      })
      .returning();

    // Optionally create a starter explain page so the node is immediately clickable
    if (body.withExplainPage) {
      await db.insert(lessonPages).values({
        nodeId: created.id,
        pageType: 'explain',
        sections: [{ heading: 'บทเรียน', body: title }],
        orderIndex: 0,
      });
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[admin/units/nodes] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create node' }, { status: 500 });
  }
}

/** PATCH /api/admin/units/[id]/nodes — reorder node within unit: {nodeId, direction} or {nodeId, toIndex} */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();

    const nodes = await db
      .select()
      .from(learningNodes)
      .where(eq(learningNodes.unitId, unitId))
      .orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));

    const idx = nodes.findIndex((n) => n.id === body.nodeId);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 });

    // Absolute move within this unit's node list.
    if (typeof body.toIndex === 'number') {
      const target = Math.max(0, Math.min(body.toIndex, nodes.length - 1));
      if (target === idx) return NextResponse.json({ success: true });
      const reordered = [...nodes];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(target, 0, moved);
      for (let i = 0; i < reordered.length; i++) {
        await db.update(learningNodes).set({ orderIndex: i }).where(eq(learningNodes.id, reordered[i].id));
      }
      return NextResponse.json({ success: true });
    }

    const { direction } = body;
    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ success: false, error: "body must contain direction ('up'|'down') or toIndex (number)" }, { status: 400 });
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= nodes.length) {
      return NextResponse.json({ success: true }); // at edge — no-op
    }

    const a = nodes[idx];
    const b = nodes[swapIdx];
    await db.update(learningNodes).set({ orderIndex: b.orderIndex }).where(eq(learningNodes.id, a.id));
    await db.update(learningNodes).set({ orderIndex: a.orderIndex }).where(eq(learningNodes.id, b.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/units/nodes] PATCH reorder error:', err);
    return NextResponse.json({ success: false, error: 'Failed to reorder node' }, { status: 500 });
  }
}
