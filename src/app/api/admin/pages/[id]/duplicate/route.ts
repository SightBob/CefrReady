import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lessonPages } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const id = Number((await props.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  const [source] = await db.select().from(lessonPages).where(eq(lessonPages.id, id)).limit(1);
  if (!source) return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
  const pages = await db.select({ orderIndex: lessonPages.orderIndex }).from(lessonPages).where(eq(lessonPages.nodeId, source.nodeId)).orderBy(asc(lessonPages.orderIndex));
  const nextOrder = pages.length ? (pages[pages.length - 1].orderIndex ?? 0) + 1 : 0;

  const [copy] = await db.insert(lessonPages).values({
    nodeId: source.nodeId,
    pageType: source.pageType,
    sections: source.sections,
    quiz: source.quiz,
    vocabBank: source.vocabBank,
    tip: source.tip,
    intro: source.intro,
    isPublished: false,
    orderIndex: nextOrder,
  }).returning();
  return NextResponse.json({ success: true, data: copy }, { status: 201 });
}
