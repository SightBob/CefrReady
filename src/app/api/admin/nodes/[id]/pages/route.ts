import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningNodes, lessonPages, lessonPageVersions } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { validateLearningPages } from '@/lib/learning-validation';

export const dynamic = 'force-dynamic';

const PAGE_TYPES = ['explain', 'quiz', 'tap'];

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
  const { error, session } = await requireAdmin();
  if (error) return error;

  const nodeId = parseInt(params.id);
  if (isNaN(nodeId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const pageType = PAGE_TYPES.includes(body.pageType) ? body.pageType : 'explain';

    const [node] = await db.select().from(learningNodes).where(eq(learningNodes.id, nodeId)).limit(1);
    if (!node) return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 });

    if (Array.isArray(body.sections)) {
      for (const rawSection of body.sections) {
        if (!rawSection || typeof rawSection !== 'object' || Array.isArray(rawSection)) {
          return NextResponse.json({ success: false, error: 'each section must be an object' }, { status: 400 });
        }
        const s = rawSection as Record<string, unknown>;
        if (s.headingSize !== undefined && !['sm', 'md', 'lg', 'xl'].includes(String(s.headingSize))) {
          return NextResponse.json({ success: false, error: 'invalid headingSize' }, { status: 400 });
        }
        if (s.bodySize !== undefined && !['sm', 'md', 'lg'].includes(String(s.bodySize))) {
          return NextResponse.json({ success: false, error: 'invalid bodySize' }, { status: 400 });
        }
        if (s.type !== undefined && !['rule', 'detailedRule', 'importantNote', 'practice'].includes(String(s.type))) {
          return NextResponse.json({ success: false, error: 'invalid section type' }, { status: 400 });
        }
        if (s.rows !== undefined) {
          const rows = s.rows;
          if (!Array.isArray(rows) || rows.some((rawRow) => {
            if (!rawRow || typeof rawRow !== 'object') return true;
            const row = rawRow as { left?: unknown; right?: unknown };
            return typeof row.left !== 'string' || (row.right !== undefined && typeof row.right !== 'string');
          })) return NextResponse.json({ success: false, error: 'rows must contain a non-empty left and optional string right' }, { status: 400 });
        }
        if (s.examples !== undefined) {
          const examples = s.examples;
          if (!Array.isArray(examples) || examples.some((rawExample) => {
            if (!rawExample || typeof rawExample !== 'object') return true;
            const example = rawExample as { en?: unknown; th?: unknown; ok?: unknown };
            return typeof example.en !== 'string' || (example.th !== undefined && typeof example.th !== 'string') || (example.ok !== undefined && typeof example.ok !== 'boolean');
          })) return NextResponse.json({ success: false, error: 'examples must contain English text and optional translation/status' }, { status: 400 });
        }
        if (s.table !== undefined) {
          const table = s.table as { headers?: unknown; rows?: unknown } | null;
          if (!table || typeof table !== 'object' || !Array.isArray(table.headers) || !Array.isArray(table.rows) || table.rows.some((row) => !Array.isArray(row))) {
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
    }

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

    if (pageType === 'tap' && body.isPublished === true) {
      const tapItems = Array.isArray(body.sections?.[0]?.tap?.items) ? body.sections[0].tap.items : [];
      const validTap = tapItems.every(
        (item: { prompt?: unknown; choiceA?: unknown; choiceB?: unknown }) =>
          typeof item.prompt === 'string' && item.prompt.trim() !== '' &&
          typeof item.choiceA === 'string' && item.choiceA.trim() !== '' &&
          typeof item.choiceB === 'string' && item.choiceB.trim() !== ''
      );
      if (tapItems.length === 0 || !validTap) {
        return NextResponse.json(
          { success: false, error: 'หน้า Tap & Select ต้องมีอย่างน้อย 1 โจทย์ที่มีประโยคและตัวเลือก A/B ครบ' },
          { status: 422 }
        );
      }
    }

    const existing = await db
      .select({ orderIndex: lessonPages.orderIndex })
      .from(lessonPages)
      .where(eq(lessonPages.nodeId, nodeId))
      .orderBy(asc(lessonPages.orderIndex));

    const shouldPublish = body.isPublished === true;
    if (shouldPublish) {
      const existingPages = await db.select({ pageType: lessonPages.pageType, sections: lessonPages.sections, quiz: lessonPages.quiz })
        .from(lessonPages)
        .where(eq(lessonPages.nodeId, nodeId));
      const validation = validateLearningPages([
        ...existingPages,
        { pageType, sections: Array.isArray(body.sections) ? body.sections : [], quiz: body.quiz ?? null },
      ]);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: 'Node ยังไม่พร้อมเผยแพร่หน้านี้', issues: validation.issues },
          { status: 422 }
        );
      }
    }
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
        // New pages start as drafts; publish only after the whole Node passes validation.
        isPublished: body.isPublished === true,
        orderIndex: nextOrder,
      })
      .returning();

    if (created) {
      await db.insert(lessonPageVersions).values({
        pageId: created.id,
        version: 1,
        snapshot: {
          pageType: created.pageType,
          sections: created.sections,
          quiz: created.quiz,
          vocabBank: created.vocabBank,
          tip: created.tip,
          intro: created.intro,
          isPublished: created.isPublished,
          orderIndex: created.orderIndex,
        },
        changeType: 'create',
        changedBy: session?.user?.id ?? null,
      });
    }

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
