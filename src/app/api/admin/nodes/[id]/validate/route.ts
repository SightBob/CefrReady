import { NextResponse } from 'next/server';
import { db } from '@/db';
import { learningNodes, lessonPages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { validateLearningPages } from '@/lib/learning-validation';

export const dynamic = 'force-dynamic';

/** GET /api/admin/nodes/[id]/validate — ตรวจความพร้อมก่อนเผยแพร่ */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const nodeId = Number(params.id);
  if (!Number.isInteger(nodeId) || nodeId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  const [node] = await db.select({ id: learningNodes.id, title: learningNodes.title })
    .from(learningNodes)
    .where(eq(learningNodes.id, nodeId))
    .limit(1);
  if (!node) return NextResponse.json({ success: false, error: 'Node not found' }, { status: 404 });

  const pages = await db.select({ pageType: lessonPages.pageType, sections: lessonPages.sections, quiz: lessonPages.quiz })
    .from(lessonPages)
    .where(eq(lessonPages.nodeId, nodeId));
  const validation = validateLearningPages(pages);

  return NextResponse.json({ success: true, data: { node, pageCount: pages.length, ...validation } });
}
