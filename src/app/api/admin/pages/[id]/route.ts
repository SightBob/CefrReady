import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessonPages, lessonPageVersions } from '@/db/schema';
import { eq, max } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { validateLearningPages } from '@/lib/learning-validation';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/pages/[id] — replace page content */
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, session } = await requireAdmin();
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
        headingSize?: 'sm' | 'md' | 'lg' | 'xl';
        bodySize?: 'sm' | 'md' | 'lg';
        examples?: Array<{ en: string; th: string; ok: boolean }>;
        table?: { headers: string[]; rows: string[][] };
        tap?: {
          title: string;
          items: Array<{ prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }>;
        };
      }>;
      quiz:
        | { sentence: string; options: string[]; answerIndex: number; explanation: string }
        | { questions: Array<{ sentence: string; options: string[]; answerIndex: number; explanation: string }> }
        | null;
      vocabBank:
        | Array<{ subject: string; verbForm: string; example: string }>
        | { columns: string[]; rows: string[][] }
        | null;
      tip: string | null;
      intro: string | null;
      isPublished: boolean;
      orderIndex: number;
    }> = {};

    if (body.pageType !== undefined) {
      if (!['explain', 'quiz', 'tap'].includes(body.pageType)) {
        return NextResponse.json({ success: false, error: 'Invalid pageType' }, { status: 400 });
      }
      updates.pageType = body.pageType;
    }
    if (body.sections !== undefined) {
      if (!Array.isArray(body.sections)) {
        return NextResponse.json({ success: false, error: 'sections must be an array' }, { status: 400 });
      }
      for (const s of body.sections) {
        // Tap pages intentionally store the exercise in sections[0].tap and
        // do not need concept heading/body fields.
        if (body.pageType !== 'tap' && (!s.heading?.trim() || !s.body?.trim())) {
          return NextResponse.json(
            { success: false, error: 'each section needs heading and body' },
            { status: 400 }
          );
        }
        if (s.headingSize !== undefined && !['sm', 'md', 'lg', 'xl'].includes(s.headingSize)) {
          return NextResponse.json({ success: false, error: 'invalid headingSize' }, { status: 400 });
        }
        if (s.bodySize !== undefined && !['sm', 'md', 'lg'].includes(s.bodySize)) {
          return NextResponse.json({ success: false, error: 'invalid bodySize' }, { status: 400 });
        }
      }
      if (body.pageType === 'tap') {
        const tapItems = body.sections[0]?.tap?.items;
        if (!Array.isArray(tapItems) || tapItems.length === 0 || tapItems.some((item: { prompt?: unknown; choiceA?: unknown; choiceB?: unknown }) =>
          typeof item.prompt !== 'string' || !item.prompt.trim() ||
          typeof item.choiceA !== 'string' || !item.choiceA.trim() ||
          typeof item.choiceB !== 'string' || !item.choiceB.trim()
        )) {
          return NextResponse.json({ success: false, error: 'หน้า Tap & Select ต้องมีโจทย์และตัวเลือก A/B ครบ' }, { status: 422 });
        }
      }
      updates.sections = body.sections;
    }
    if (body.quiz !== undefined) {
      if (body.quiz === null) {
        updates.quiz = null;
      } else {
        const q = body.quiz;
        const questions = Array.isArray(q.questions) ? q.questions : [q];
        for (const item of questions) {
          if (!item.sentence?.trim() || !Array.isArray(item.options) || item.options.length < 2) {
            return NextResponse.json(
              { success: false, error: 'ทุกข้อสอบต้องมีโจทย์และอย่างน้อย 2 ตัวเลือก' },
              { status: 400 }
            );
          }
          if (typeof item.answerIndex !== 'number' || item.answerIndex < 0 || item.answerIndex >= item.options.length) {
            return NextResponse.json({ success: false, error: 'quiz answerIndex out of range' }, { status: 400 });
          }
        }
        updates.quiz = {
          questions: questions.map((item: { sentence: string; options: unknown[]; answerIndex: number; explanation?: string }) => ({
            sentence: item.sentence.trim(),
            options: item.options.map((o) => String(o).trim()).filter(Boolean),
            answerIndex: item.answerIndex,
            explanation: item.explanation?.trim() ?? '',
          })),
        };
        // keep pageType consistent
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
    if (body.isPublished !== undefined) updates.isPublished = Boolean(body.isPublished);
    if (body.orderIndex !== undefined) updates.orderIndex = Number(body.orderIndex);

    const [currentPage] = await db.select().from(lessonPages).where(eq(lessonPages.id, pageId)).limit(1);
    if (!currentPage) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (updates.isPublished === true) {
      const nodePages = await db.select({ id: lessonPages.id, pageType: lessonPages.pageType, sections: lessonPages.sections, quiz: lessonPages.quiz })
        .from(lessonPages)
        .where(eq(lessonPages.nodeId, currentPage.nodeId));
      const candidatePages = nodePages.map((page) => page.id === pageId ? { ...page, ...updates } : page);
      const validation = validateLearningPages(candidatePages);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: 'Node ยังไม่พร้อมเผยแพร่หน้านี้', issues: validation.issues },
          { status: 422 }
        );
      }
    }

    const [{ value: latest }] = await db.select({ value: max(lessonPageVersions.version) })
      .from(lessonPageVersions)
      .where(eq(lessonPageVersions.pageId, pageId));
    await db.insert(lessonPageVersions).values({
      pageId,
      version: Number(latest ?? 0) + 1,
      snapshot: {
        pageType: currentPage.pageType,
        sections: currentPage.sections,
        quiz: currentPage.quiz,
        vocabBank: currentPage.vocabBank,
        tip: currentPage.tip,
        intro: currentPage.intro,
        isPublished: currentPage.isPublished,
        orderIndex: currentPage.orderIndex,
      },
      changeType: updates.isPublished !== undefined && updates.isPublished !== currentPage.isPublished ? 'publish' : 'update',
      changedBy: session?.user?.id ?? null,
    });

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
