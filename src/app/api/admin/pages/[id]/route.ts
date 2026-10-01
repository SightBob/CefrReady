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
      sections: Array<Record<string, unknown>>;
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
      for (const rawSection of body.sections) {
        if (!rawSection || typeof rawSection !== 'object' || Array.isArray(rawSection)) {
          return NextResponse.json({ success: false, error: 'each section must be an object' }, { status: 400 });
        }
        const s = rawSection as Record<string, unknown>;
        if (s.type !== undefined && !['rule', 'detailedRule', 'importantNote', 'practice'].includes(String(s.type))) {
          return NextResponse.json({ success: false, error: 'invalid section type' }, { status: 400 });
        }
        if (s.rows !== undefined && (!Array.isArray(s.rows) || s.rows.some((row) => !row || typeof row !== 'object' || typeof row.left !== 'string' || (row.right !== undefined && typeof row.right !== 'string')))) {
          return NextResponse.json({ success: false, error: 'rows must contain a non-empty left and optional string right' }, { status: 400 });
        }
        if (s.examples !== undefined && (!Array.isArray(s.examples) || s.examples.some((example) => !example || typeof example !== 'object' || typeof example.en !== 'string' || (example.th !== undefined && typeof example.th !== 'string') || (example.ok !== undefined && typeof example.ok !== 'boolean')))) {
          return NextResponse.json({ success: false, error: 'examples must contain English text and optional translation/status' }, { status: 400 });
        }
        if (s.table !== undefined) {
          const table = s.table as { headers?: unknown; rows?: unknown } | null;
          if (!table || typeof table !== 'object' || !Array.isArray(table.headers) || !Array.isArray(table.rows) || table.rows.some((row: unknown) => !Array.isArray(row))) {
            return NextResponse.json({ success: false, error: 'table must contain headers and rows arrays' }, { status: 400 });
          }
        }
        if (s.type === 'practice' && s.practice === undefined) {
          return NextResponse.json({ success: false, error: 'practice section must include a questions array' }, { status: 400 });
        }
        if (s.practice !== undefined) {
          const practice = s.practice as { questions?: unknown } | null;
          if (!practice || typeof practice !== 'object' || !Array.isArray(practice.questions) || practice.questions.some((rawQuestion) => {
            if (!rawQuestion || typeof rawQuestion !== 'object') return true;
            const question = rawQuestion as { sentence?: unknown; options?: unknown; answerIndex?: unknown };
            return typeof question.sentence !== 'string' || !Array.isArray(question.options) || typeof question.answerIndex !== 'number' || question.answerIndex < 0 || question.answerIndex >= question.options.length;
          })) {
            return NextResponse.json({ success: false, error: 'practice must contain a questions array with valid sentence, options, and answerIndex' }, { status: 400 });
          }
        }
        for (const field of ['heading', 'body', 'chip', 'description', 'tip'] as const) {
          if (s[field] !== undefined && s[field] !== null && typeof s[field] !== 'string') {
            return NextResponse.json({ success: false, error: `${field} must be a string` }, { status: 400 });
          }
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

    // Only validate node completeness when this page is being published for
    // the first time (or republished after being a draft). Editing an already
    // published page must remain saveable even if other node content is still
    // incomplete; node-level readiness is enforced at the publication step.
    if (updates.isPublished === true && !currentPage.isPublished) {
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
