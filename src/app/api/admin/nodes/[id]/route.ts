import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningNodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const KINDS = ['star', 'chest', 'trophy'];

/** PATCH /api/admin/nodes/[id] — update node metadata */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const nodeId = parseInt(params.id);
  if (isNaN(nodeId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const updates: Partial<{ title: string; kind: string; isPublished: boolean; orderIndex: number }> = {};
    if (body.title !== undefined) {
      if (!body.title?.trim()) return NextResponse.json({ success: false, error: 'title cannot be empty' }, { status: 400 });
      updates.title = body.title.trim();
    }
    if (body.kind !== undefined) {
      if (!KINDS.includes(body.kind)) {
        return NextResponse.json({ success: false, error: 'Invalid kind' }, { status: 400 });
      }
      updates.kind = body.kind;
    }
    if (body.isPublished !== undefined) updates.isPublished = Boolean(body.isPublished);
    if (body.orderIndex !== undefined) updates.orderIndex = Number(body.orderIndex);

    const [updated] = await db
      .update(learningNodes)
      .set(updates)
      .where(eq(learningNodes.id, nodeId))
      .returning();
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/nodes/id] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update node' }, { status: 500 });
  }
}

/** DELETE /api/admin/nodes/[id] — delete node (cascades to pages) */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const nodeId = parseInt(params.id);
  if (isNaN(nodeId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    await db.delete(learningNodes).where(eq(learningNodes.id, nodeId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/nodes/id] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete node' }, { status: 500 });
  }
}
