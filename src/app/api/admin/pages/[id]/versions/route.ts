import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessonPages, lessonPageVersions } from '@/db/schema';
import { and, desc, eq, max } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { validateLearningPages } from '@/lib/learning-validation';

export const dynamic = 'force-dynamic';

function snapshotOf(page: typeof lessonPages.$inferSelect) {
  return {
    pageType: page.pageType,
    sections: page.sections,
    quiz: page.quiz,
    vocabBank: page.vocabBank,
    tip: page.tip,
    intro: page.intro,
    isPublished: page.isPublished,
    orderIndex: page.orderIndex,
  };
}

/** GET /api/admin/pages/[id]/versions */
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;
  const pageId = Number(params.id);
  if (!Number.isInteger(pageId) || pageId <= 0) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  const versions = await db.select({
    id: lessonPageVersions.id,
    version: lessonPageVersions.version,
    changeType: lessonPageVersions.changeType,
    changedBy: lessonPageVersions.changedBy,
    createdAt: lessonPageVersions.createdAt,
  }).from(lessonPageVersions)
    .where(eq(lessonPageVersions.pageId, pageId))
    .orderBy(desc(lessonPageVersions.version));
  return NextResponse.json({ success: true, data: versions });
}

/** POST /api/admin/pages/[id]/versions/restore — restore a snapshot */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, session } = await requireAdmin();
  if (error) return error;
  const pageId = Number(params.id);
  if (!Number.isInteger(pageId) || pageId <= 0) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const versionId = Number(body.versionId);
    if (!Number.isInteger(versionId) || versionId <= 0) return NextResponse.json({ success: false, error: 'Invalid versionId' }, { status: 400 });

    const [current] = await db.select().from(lessonPages).where(eq(lessonPages.id, pageId)).limit(1);
    const [version] = await db.select().from(lessonPageVersions)
      .where(and(eq(lessonPageVersions.id, versionId), eq(lessonPageVersions.pageId, pageId))).limit(1);
    if (!current || !version) return NextResponse.json({ success: false, error: 'ไม่พบเวอร์ชันที่ต้องการกู้คืน' }, { status: 404 });

    const snapshot = version.snapshot as Record<string, unknown>;
    const next: Partial<typeof lessonPages.$inferInsert> = {
      pageType: ['explain', 'quiz', 'tap'].includes(snapshot.pageType as string) ? (snapshot.pageType as string) : 'explain',
      sections: Array.isArray(snapshot.sections) ? snapshot.sections : [],
      quiz: (snapshot.quiz ?? null) as any,
      vocabBank: (snapshot.vocabBank ?? null) as any,
      tip: typeof snapshot.tip === 'string' ? snapshot.tip : null,
      intro: typeof snapshot.intro === 'string' ? snapshot.intro : null,
      isPublished: Boolean(snapshot.isPublished),
      orderIndex: Number(snapshot.orderIndex) || 0,
    };

    if (next.isPublished) {
      const pages = await db.select({ id: lessonPages.id, pageType: lessonPages.pageType, sections: lessonPages.sections, quiz: lessonPages.quiz })
        .from(lessonPages).where(eq(lessonPages.nodeId, current.nodeId));
      const validation = validateLearningPages(pages.map((page) => page.id === pageId ? { ...page, ...next } : page));
      if (!validation.valid) return NextResponse.json({ success: false, error: 'เวอร์ชันนี้ยังไม่พร้อมเผยแพร่', issues: validation.issues }, { status: 422 });
    }

    const [{ value: latest }] = await db.select({ value: max(lessonPageVersions.version) })
      .from(lessonPageVersions).where(eq(lessonPageVersions.pageId, pageId));
    const nextVersion = Number(latest ?? 0) + 1;
    await db.insert(lessonPageVersions).values({
      pageId,
      version: nextVersion,
      snapshot: snapshotOf(current),
      changeType: 'restore',
      changedBy: session?.user?.id ?? null,
    });
    const [updated] = await db.update(lessonPages).set(next).where(eq(lessonPages.id, pageId)).returning();
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/page-versions] restore error:', err);
    return NextResponse.json({ success: false, error: 'กู้คืนเวอร์ชันไม่สำเร็จ' }, { status: 500 });
  }
}
