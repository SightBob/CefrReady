import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { validateLearningPages } from '@/lib/learning-validation';

export const dynamic = 'force-dynamic';

const COLOR_KEYS = ['green', 'blue', 'purple', 'orange'];

/** PATCH /api/admin/units/[id] — update unit metadata */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const updates: Partial<{
      title: string;
      subtitle: string | null;
      colorKey: string;
      orderIndex: number;
      isPublished: boolean;
    }> = {};
    if (body.title !== undefined) {
      if (!body.title?.trim()) return NextResponse.json({ success: false, error: 'title cannot be empty' }, { status: 400 });
      updates.title = body.title.trim();
    }
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle?.trim() || null;
    if (body.colorKey !== undefined) {
      if (!COLOR_KEYS.includes(body.colorKey)) {
        return NextResponse.json({ success: false, error: 'Invalid colorKey' }, { status: 400 });
      }
      updates.colorKey = body.colorKey;
    }
    if (body.orderIndex !== undefined) updates.orderIndex = Number(body.orderIndex);
    if (body.isPublished !== undefined) {
      const nextPublished = Boolean(body.isPublished);
      if (nextPublished) {
        const nodes = await db.select({ id: learningNodes.id })
          .from(learningNodes)
          .where(eq(learningNodes.unitId, unitId));
        const incompleteNodes: Array<{ nodeId: number; issues: ReturnType<typeof validateLearningPages>['issues'] }> = [];
        for (const node of nodes) {
          const pages = await db.select({ pageType: lessonPages.pageType, sections: lessonPages.sections, quiz: lessonPages.quiz })
            .from(lessonPages)
            .where(eq(lessonPages.nodeId, node.id));
          const validation = validateLearningPages(pages);
          if (!validation.valid) incompleteNodes.push({ nodeId: node.id, issues: validation.issues });
        }
        if (incompleteNodes.length > 0) {
          return NextResponse.json(
            { success: false, error: `Unit ยังไม่พร้อมเผยแพร่ มี ${incompleteNodes.length} Node ที่ข้อมูลไม่ครบ`, incompleteNodes },
            { status: 422 }
          );
        }
      }
      updates.isPublished = nextPublished;
    }

    const [updated] = await db
      .update(learningUnits)
      .set(updates)
      .where(eq(learningUnits.id, unitId))
      .returning();
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/units/id] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update unit' }, { status: 500 });
  }
}

/** DELETE /api/admin/units/[id] — delete unit (cascades to nodes + pages) */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    await db.delete(learningUnits).where(eq(learningUnits.id, unitId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/units/id] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete unit' }, { status: 500 });
  }
}

/**
 * POST /api/admin/units/[id] — reorder helper.
 * Body: {direction: 'up' | 'down'} (one step) or {toIndex: number} (absolute
 * position in the ordered list, 0-based) for drag-and-drop / jump-to-position.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();

    const all = await db
      .select()
      .from(learningUnits)
      .orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));

    const idx = all.findIndex((u) => u.id === unitId);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Absolute move: {toIndex} — reorder the whole list then rewrite orderIndexes.
    if (typeof body.toIndex === 'number') {
      const target = Math.max(0, Math.min(body.toIndex, all.length - 1));
      if (target === idx) return NextResponse.json({ success: true });
      const reordered = [...all];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(target, 0, moved);
      for (let i = 0; i < reordered.length; i++) {
        await db.update(learningUnits).set({ orderIndex: i }).where(eq(learningUnits.id, reordered[i].id));
      }
      return NextResponse.json({ success: true });
    }

    // Relative move: {direction}
    const { direction } = body;
    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ success: false, error: "body must contain direction ('up'|'down') or toIndex (number)" }, { status: 400 });
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= all.length) {
      return NextResponse.json({ success: true, data: all[idx] }); // already at edge
    }

    // Swap orderIndexes
    const a = all[idx];
    const b = all[swapIdx];
    await db.update(learningUnits).set({ orderIndex: b.orderIndex }).where(eq(learningUnits.id, a.id));
    await db.update(learningUnits).set({ orderIndex: a.orderIndex }).where(eq(learningUnits.id, b.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/units/id] reorder error:', err);
    return NextResponse.json({ success: false, error: 'Failed to reorder' }, { status: 500 });
  }
}
