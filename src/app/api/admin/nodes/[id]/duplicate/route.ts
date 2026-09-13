import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningNodes, lessonPages } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const id = Number((await props.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  const [source] = await db.select().from(learningNodes).where(eq(learningNodes.id, id)).limit(1);
  if (!source) return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 });
  const siblings = await db.select({ orderIndex: learningNodes.orderIndex }).from(learningNodes).where(eq(learningNodes.unitId, source.unitId)).orderBy(asc(learningNodes.orderIndex));
  const [copy] = await db.insert(learningNodes).values({
    unitId: source.unitId,
    title: `${source.title} (สำเนา)`,
    kind: source.kind,
    orderIndex: siblings.length ? (siblings[siblings.length - 1].orderIndex ?? 0) + 1 : 0,
    isPublished: false,
    passScore: source.passScore,
  }).returning();

  const pages = await db.select().from(lessonPages).where(eq(lessonPages.nodeId, source.id)).orderBy(asc(lessonPages.orderIndex), asc(lessonPages.id));
  if (pages.length) {
    await db.insert(lessonPages).values(pages.map((page) => ({
      nodeId: copy.id,
      pageType: page.pageType,
      sections: page.sections,
      quiz: page.quiz,
      vocabBank: page.vocabBank,
      tip: page.tip,
      intro: page.intro,
      isPublished: false,
      orderIndex: page.orderIndex,
    })));
  }
  return NextResponse.json({ success: true, data: copy }, { status: 201 });
}
