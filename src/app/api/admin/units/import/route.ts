import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningUnits, learningNodes, lessonPages, learningPathBackups } from '@/db/schema';
import { asc, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const COLOR_KEYS = ['green', 'blue', 'purple', 'orange'];
const NODE_KINDS = ['star', 'chest', 'trophy'];

interface ImportPage {
  pageType?: unknown;
  sections?: unknown;
  quiz?: unknown;
  vocabBank?: unknown;
  tip?: unknown;
  intro?: unknown;
  isPublished?: unknown;
  orderIndex?: unknown;
}

interface ImportNode {
  title?: unknown;
  kind?: unknown;
  orderIndex?: unknown;
  isPublished?: unknown;
  passScore?: unknown;
  pages?: unknown;
}

interface ImportUnit {
  title?: unknown;
  subtitle?: unknown;
  colorKey?: unknown;
  orderIndex?: unknown;
  isPublished?: unknown;
  nodes?: unknown;
}

/** Returns an error string, or null when valid. */
function validate(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return 'file must contain a JSON object';
  const { units } = payload as { units?: unknown };
  if (!Array.isArray(units) || units.length === 0) return '"units" must be a non-empty array';

  for (const [ui, u] of (units as ImportUnit[]).entries()) {
    if (typeof u.title !== 'string' || !u.title.trim()) return `units[${ui}]: title is required`;
    if (u.colorKey !== undefined && !COLOR_KEYS.includes(u.colorKey as string)) {
      return `units[${ui}]: colorKey must be one of ${COLOR_KEYS.join(', ')}`;
    }
    if (u.nodes !== undefined && !Array.isArray(u.nodes)) return `units[${ui}]: nodes must be an array`;

    for (const [ni, n] of ((u.nodes ?? []) as ImportNode[]).entries()) {
      if (typeof n.title !== 'string' || !n.title.trim()) return `units[${ui}].nodes[${ni}]: title is required`;
      if (n.kind !== undefined && !NODE_KINDS.includes(n.kind as string)) {
        return `units[${ui}].nodes[${ni}]: kind must be one of ${NODE_KINDS.join(', ')}`;
      }
      for (const [pi, p] of ((n.pages ?? []) as ImportPage[]).entries()) {
        const pt = p.pageType ?? 'explain';
        if (!['explain', 'quiz'].includes(pt as string)) {
          return `units[${ui}].nodes[${ni}].pages[${pi}]: pageType must be explain or quiz`;
        }
        if (pt === 'quiz' && p.quiz) {
          const q = p.quiz as { sentence?: unknown; options?: unknown; answerIndex?: unknown };
          if (typeof q.sentence !== 'string' || !q.sentence.trim()) {
            return `units[${ui}].nodes[${ni}].pages[${pi}]: quiz.sentence is required`;
          }
          if (!Array.isArray(q.options) || q.options.length < 2) {
            return `units[${ui}].nodes[${ni}].pages[${pi}]: quiz needs at least 2 options`;
          }
          const ai = q.answerIndex ?? 0;
          if (typeof ai !== 'number' || ai < 0 || ai >= q.options.length) {
            return `units[${ui}].nodes[${ni}].pages[${pi}]: quiz.answerIndex out of range`;
          }
        }
      }
    }
  }
  return null;
}

/**
 * POST /api/admin/units/import — import a learning-path JSON file.
 *
 * Body: { payload, mode }
 * - mode "merge" (default): appends units to the end of the current path.
 * - mode "replace": DELETES all existing units/nodes/pages first, then inserts.
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const payload = body.payload;

    const validationError = validate(payload);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    // Normalize once, outside the transaction
    const units = (payload as { units: ImportUnit[] }).units.map((u, ui) => ({
      title: (u.title as string).trim(),
      subtitle: typeof u.subtitle === 'string' && u.subtitle.trim() ? u.subtitle.trim() : null,
      colorKey: COLOR_KEYS.includes(u.colorKey as string) ? (u.colorKey as string) : 'green',
      orderIndex: typeof u.orderIndex === 'number' ? u.orderIndex : ui,
      isPublished: u.isPublished !== false,
      nodes: ((u.nodes ?? []) as ImportNode[]).map((n, ni) => ({
        title: (n.title as string).trim(),
        kind: NODE_KINDS.includes(n.kind as string) ? (n.kind as string) : 'star',
        orderIndex: typeof n.orderIndex === 'number' ? n.orderIndex : ni,
        isPublished: n.isPublished !== false,
        passScore: typeof n.passScore === 'number' && n.passScore >= 0 && n.passScore <= 100 ? Math.round(n.passScore) : 100,
        pages: ((n.pages ?? []) as ImportPage[]).map((p, pi) => ({
          pageType: p.pageType === 'quiz' ? 'quiz' : 'explain',
          sections: Array.isArray(p.sections) ? p.sections : [],
          quiz: (p.quiz ?? null) as ImportPage['quiz'],
          vocabBank: (p.vocabBank ?? null) as ImportPage['vocabBank'],
          tip: typeof p.tip === 'string' && p.tip.trim() ? p.tip.trim() : null,
          intro: typeof p.intro === 'string' && p.intro.trim() ? p.intro.trim() : null,
          isPublished: p.isPublished !== false,
          orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : pi,
        })),
      })),
    }));

    // For merge mode: shift existing units to the end of the order range
    let baseOrder = 0;
    if (mode === 'merge') {
      const [row] = await db
        .select({ max: sql<number | null>`max(${learningUnits.orderIndex})` })
        .from(learningUnits);
      baseOrder = (row?.max ?? -1) + 1;
    }

    let unitCount = 0;
    let nodeCount = 0;
    let pageCount = 0;

    if (mode === 'replace') {
      // Keep an immutable snapshot before destructive replacement so an admin
      // can download or restore the previous path if the import is wrong.
      const currentUnits = await db.select().from(learningUnits).orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));
      const currentNodes = await db.select().from(learningNodes).orderBy(asc(learningNodes.unitId), asc(learningNodes.orderIndex), asc(learningNodes.id));
      const currentPages = await db.select().from(lessonPages).orderBy(asc(lessonPages.nodeId), asc(lessonPages.orderIndex), asc(lessonPages.id));
      const backupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        units: currentUnits.map((u) => ({
          title: u.title, subtitle: u.subtitle, colorKey: u.colorKey, orderIndex: u.orderIndex, isPublished: u.isPublished,
          nodes: currentNodes.filter((n) => n.unitId === u.id).map((n) => ({
            title: n.title, kind: n.kind, orderIndex: n.orderIndex, isPublished: n.isPublished, passScore: n.passScore,
            pages: currentPages.filter((p) => p.nodeId === n.id).map((p) => ({ pageType: p.pageType, sections: p.sections, quiz: p.quiz, vocabBank: p.vocabBank, tip: p.tip, intro: p.intro, isPublished: p.isPublished, orderIndex: p.orderIndex })),
          })),
        })),
      };
      if (currentUnits.length > 0) {
        await db.insert(learningPathBackups).values({ payload: backupPayload, createdBy: session?.user?.id ?? null });
      }
      await db.delete(lessonPages);
      await db.delete(learningNodes);
      await db.delete(learningUnits);
    }

    for (const [ui, u] of units.entries()) {
      const [unitRow] = await db
        .insert(learningUnits)
        .values({
          title: u.title,
          subtitle: u.subtitle,
          colorKey: u.colorKey,
          orderIndex: baseOrder + ui,
          isPublished: u.isPublished,
        })
        .returning();
      unitCount++;

      for (const [ni, n] of u.nodes.entries()) {
        const [nodeRow] = await db
          .insert(learningNodes)
          .values({
            unitId: unitRow.id,
            title: n.title,
            kind: n.kind,
            orderIndex: n.orderIndex,
            isPublished: n.isPublished,
            passScore: n.passScore,
          })
          .returning();
        nodeCount++;

        for (const [pi, p] of n.pages.entries()) {
          await db.insert(lessonPages).values({
            nodeId: nodeRow.id,
            pageType: p.pageType as string,
            sections: p.sections as Array<{ heading: string; body: string; examples?: Array<{ en: string; th: string; ok: boolean }>; table?: { headers: string[]; rows: string[][] } }>,
            quiz: p.quiz as { sentence: string; options: string[]; answerIndex: number; explanation: string } | null,
            vocabBank: p.vocabBank as Array<{ subject: string; verbForm: string; example: string }> | { columns: string[]; rows: string[][] } | null,
            tip: p.tip,
            intro: p.intro,
            isPublished: p.isPublished,
            orderIndex: p.orderIndex as number,
          });
          pageCount++;
          void pi; // orderIndex comes normalized from p
        }
        void ni;
      }
    }

    return NextResponse.json({
      success: true,
      data: { mode, unitCount, nodeCount, pageCount },
    });
  } catch (err) {
    console.error('[admin/units/import] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to import' }, { status: 500 });
  }
}
