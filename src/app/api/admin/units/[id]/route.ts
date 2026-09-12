import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

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
    if (body.isPublished !== undefined) updates.isPublished = Boolean(body.isPublished);

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

/** POST /api/admin/units/[id] — reorder helper: {direction: 'up' | 'down'} */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const unitId = parseInt(params.id);
  if (isNaN(unitId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const { direction } = await request.json();
    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ success: false, error: 'direction must be up or down' }, { status: 400 });
    }

    const all = await db
      .select()
      .from(learningUnits)
      .orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));

    const idx = all.findIndex((u) => u.id === unitId);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

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
