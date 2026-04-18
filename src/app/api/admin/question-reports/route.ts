import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questionReports, questions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'all';

    const rows = await db
      .select({
        id: questionReports.id,
        questionId: questionReports.questionId,
        questionText: questions.questionText,
        testTypeId: questions.testTypeId,
        userId: questionReports.userId,
        userEmail: users.email,
        issueType: questionReports.issueType,
        comment: questionReports.comment,
        status: questionReports.status,
        createdAt: questionReports.createdAt,
      })
      .from(questionReports)
      .leftJoin(questions, eq(questionReports.questionId, questions.id))
      .leftJoin(users, eq(questionReports.userId, users.id))
      .where(status !== 'all' ? eq(questionReports.status, status) : undefined)
      .orderBy(desc(questionReports.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/question-reports] error:', err);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
