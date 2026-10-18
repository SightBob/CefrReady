import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questionReports, questions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withAdmin } from '@/lib/admin-route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await withAdmin({ keySuffix: 'admin:question-reports', maxRequests: 20 });
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

    // ให้รูปแบบเดียวกับ admin endpoint อื่น ๆ (เดิมคืน array เปล่า ๆ
    // ทำให้ฝั่งหน้าแยกไม่ออกว่า error หรือไม่มีข้อมูล)
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /api/admin/question-reports] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}
