import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessonPages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/pages/[id] — replace page content */
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const pageId = parseInt(params.id);
  if (isNaN(pageId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();

    const updates: Partial<{
      pageType: string;
      sections: Array<{
        heading: string;
        body: string;
        examples?: Array<{ en: string; th: string; ok: boolean }>;
        table?: { headers: string[]; rows: string[][] };
      }>;
      quiz: { sentence: string; options: string[]; answerIndex: number; explanation: string } | null;
      vocabBank:
        | Array<{ subject: string; verbForm: string; example: string }>
        | { columns: string[]; rows: string[][] }
        | null;
      tip: string | null;
      intro: string | null;
      orderIndex: number;
    }> = {};

    if (body.pageType !== undefined) {
      if (!['explain', 'quiz'].includes(body.pageType)) {
        return NextResponse.json({ success: false, error: 'Invalid pageType' }, { status: 400 });
      }
      updates.pageType = body.pageType;
    }
    if (body.sections !== undefined) {
      if (!Array.isArray(body.sections)) {
        return NextResponse.json({ success: false, error: 'sections must be an array' }, { status: 400 });
      }
      for (const s of body.sections) {
        if (!s.heading?.trim() || !s.body?.trim()) {
          return NextResponse.json(
            { success: false, error: 'each section needs heading and body' },
            { status: 400 }
          );
        }
      }
      updates.sections = body.sections;
    }
    if (body.quiz !== undefined) {
      if (body.quiz === null) {
        updates.quiz = null;
      } else {
        const q = body.quiz;
        if (!q.sentence?.trim() || !Array.isArray(q.options) || q.options.length < 2) {
          return NextResponse.json(
            { success: false, error: 'quiz needs sentence and at least 2 options' },
            { status: 400 }
          );
        }
        if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex >= q.options.length) {
          return NextResponse.json({ success: false, error: 'quiz answerIndex out of range' }, { status: 400 });
        }
        updates.quiz = {
          sentence: q.sentence.trim(),
          options: q.options.map((o: unknown) => String(o).trim()).filter(Boolean),
          answerIndex: q.answerIndex,
          explanation: q.explanation?.trim() ?? '',
        };
        // keep pageType consistent
        updates.pageType = 'quiz';
      }
    }
    if (body.vocabBank !== undefined) {
      // Two accepted shapes:
      // legacy: VocabRow[] (subject/verbForm/example)
      // current: { columns: string[], rows: string[][] } — 2..8 columns
      if (body.vocabBank === null) {
        updates.vocabBank = null;
      } else if (Array.isArray(body.vocabBank)) {
        updates.vocabBank = body.vocabBank.length > 0 ? body.vocabBank : null;
      } else if (
        typeof body.vocabBank === 'object' &&
        Array.isArray(body.vocabBank.columns) &&
        body.vocabBank.columns.length >= 2 &&
        body.vocabBank.columns.length <= 8 &&
        body.vocabBank.columns.every((c: unknown) => typeof c === 'string' && c.trim() !== '') &&
        Array.isArray(body.vocabBank.rows)
      ) {
        const cols: string[] = body.vocabBank.columns;
        const badRow = body.vocabBank.rows.some(
          (r: unknown) => !Array.isArray(r) || r.length !== cols.length
        );
        if (badRow) {
          return NextResponse.json(
            { success: false, error: 'each vocabBank row must have one cell per column' },
            { status: 400 }
          );
        }
        updates.vocabBank = {
          columns: cols.map((c: string) => c.trim()),
          rows: body.vocabBank.rows.map((r: unknown[]) => r.map((c) => String(c ?? '').trim())),
        };
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'vocabBank must be null, a row array, or { columns: string[] (2-8), rows: string[][] }',
          },
          { status: 400 }
        );
      }
    }
    if (body.tip !== undefined) updates.tip = body.tip?.trim() || null;
    if (body.intro !== undefined) updates.intro = body.intro?.trim() || null;
    if (body.orderIndex !== undefined) updates.orderIndex = Number(body.orderIndex);

    const [updated] = await db
      .update(lessonPages)
      .set(updates)
      .where(eq(lessonPages.id, pageId))
      .returning();
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/pages/id] PUT error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update page' }, { status: 500 });
  }
}

/** DELETE /api/admin/pages/[id] */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const pageId = parseInt(params.id);
  if (isNaN(pageId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    await db.delete(lessonPages).where(eq(lessonPages.id, pageId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/pages/id] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete page' }, { status: 500 });
  }
}
