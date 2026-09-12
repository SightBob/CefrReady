import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const COLOR_KEYS = ['green', 'blue', 'purple', 'orange'];

/** GET /api/admin/units — full tree: units → nodes (page counts included) */
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

    const data = units.map((u) => ({
      ...u,
      nodes: nodes.filter((n) => n.unitId === u.id),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[admin/units] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch units' }, { status: 500 });
  }
}

/** POST /api/admin/units — create unit (appends to end of path) */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }
    const colorKey = COLOR_KEYS.includes(body.colorKey) ? body.colorKey : 'green';

    const existing = await db
      .select({ orderIndex: learningUnits.orderIndex })
      .from(learningUnits)
      .orderBy(asc(learningUnits.orderIndex));
    const nextOrder =
      existing.length > 0 ? (existing[existing.length - 1].orderIndex ?? 0) + 1 : 0;

    const [created] = await db
      .insert(learningUnits)
      .values({
        title,
        subtitle: body.subtitle?.trim() || null,
        colorKey,
        orderIndex: nextOrder,
        isPublished: body.isPublished ?? true,
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[admin/units] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create unit' }, { status: 500 });
  }
}
