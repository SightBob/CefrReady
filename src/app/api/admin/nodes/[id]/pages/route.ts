import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningNodes, lessonPages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const PAGE_TYPES = ['explain', 'quiz'];

/** GET /api/admin/nodes/[id]/pages — pages of one node */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const nodeId = parseInt(params.id);
  if (isNaN(nodeId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const pages = await db
      .select()
      .from(lessonPages)
      .where(eq(lessonPages.nodeId, nodeId))
      .orderBy(asc(lessonPages.orderIndex), asc(lessonPages.id));
    return NextResponse.json({ success: true, data: pages });
  } catch (err) {
    console.error('[admin/nodes/pages] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch pages' }, { status: 500 });
  }
}

/** POST /api/admin/nodes/[id]/pages — create page */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const nodeId = parseInt(params.id);
  if (isNaN(nodeId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const pageType = PAGE_TYPES.includes(body.pageType) ? body.pageType : 'explain';

    const [node] = await db.select().from(learningNodes).where(eq(learningNodes.id, nodeId)).limit(1);
    if (!node) return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 });

    if (pageType === 'quiz' && body.quiz) {
      const questions = Array.isArray(body.quiz.questions) ? body.quiz.questions : [body.quiz];
      for (const q of questions) {
        if (!q.sentence?.trim() || !Array.isArray(q.options) || q.options.length < 2) {
          return NextResponse.json(
            { success: false, error: 'ทุกข้อสอบต้องมีโจทย์และอย่างน้อย 2 ตัวเลือก' },
            { status: 400 }
          );
        }
        if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex >= q.options.length) {
          return NextResponse.json({ success: false, error: 'quiz answerIndex out of range' }, { status: 400 });
        }
      }
    }

    const existing = await db
      .select({ orderIndex: lessonPages.orderIndex })
      .from(lessonPages)
      .where(eq(lessonPages.nodeId, nodeId))
      .orderBy(asc(lessonPages.orderIndex));
    const nextOrder =
      existing.length > 0 ? (existing[existing.length - 1].orderIndex ?? 0) + 1 : 0;

    const [created] = await db
      .insert(lessonPages)
      .values({
        nodeId,
        pageType,
        sections: Array.isArray(body.sections) ? body.sections : [],
        quiz: body.quiz ?? null,
        vocabBank:
          Array.isArray(body.vocabBank)
            ? body.vocabBank
            : body.vocabBank &&
                typeof body.vocabBank === 'object' &&
                Array.isArray(body.vocabBank.columns) &&
                body.vocabBank.columns.length >= 2 &&
                body.vocabBank.columns.length <= 8
              ? {
                  columns: body.vocabBank.columns,
                  rows: Array.isArray(body.vocabBank.rows) ? body.vocabBank.rows : [],
                }
              : null,
        tip: body.tip?.trim() || null,
        intro: body.intro?.trim() || null,
        isPublished: body.isPublished !== false,
        orderIndex: nextOrder,
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[admin/nodes/pages] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create page' }, { status: 500 });
  }
}

/** PATCH /api/admin/nodes/[id]/pages — reorder page: {pageId, direction} or {pageId, toIndex} */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const nodeId = parseInt(params.id);
  if (isNaN(nodeId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();

    const pages = await db
      .select()
      .from(lessonPages)
      .where(eq(lessonPages.nodeId, nodeId))
      .orderBy(asc(lessonPages.orderIndex), asc(lessonPages.id));

    const idx = pages.findIndex((p) => p.id === body.pageId);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });

    // Absolute move within this node's page list.
    if (typeof body.toIndex === 'number') {
      const target = Math.max(0, Math.min(body.toIndex, pages.length - 1));
      if (target === idx) return NextResponse.json({ success: true });
      const reordered = [...pages];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(target, 0, moved);
      for (let i = 0; i < reordered.length; i++) {
        await db.update(lessonPages).set({ orderIndex: i }).where(eq(lessonPages.id, reordered[i].id));
      }
      return NextResponse.json({ success: true });
    }

    const { direction } = body;
    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ success: false, error: "body must contain direction ('up'|'down') or toIndex (number)" }, { status: 400 });
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pages.length) {
      return NextResponse.json({ success: true });
    }

    const a = pages[idx];
    const b = pages[swapIdx];
    await db.update(lessonPages).set({ orderIndex: b.orderIndex }).where(eq(lessonPages.id, a.id));
    await db.update(lessonPages).set({ orderIndex: a.orderIndex }).where(eq(lessonPages.id, b.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/nodes/pages] PATCH reorder error:', err);
    return NextResponse.json({ success: false, error: 'Failed to reorder page' }, { status: 500 });
  }
}
