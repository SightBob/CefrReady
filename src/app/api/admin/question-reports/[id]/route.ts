import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questionReports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

const VALID_STATUSES = ['pending', 'in_progress', 'resolved'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const reportId = parseInt(id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status', validStatuses: VALID_STATUSES }, { status: 400 });
    }

    const [updated] = await db
      .update(questionReports)
      .set({ status })
      .where(eq(questionReports.id, reportId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/admin/question-reports/[id]] error:', err);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
