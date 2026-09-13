import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learningPathBackups } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const id = Number((await props.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  const [backup] = await db.select().from(learningPathBackups).where(eq(learningPathBackups.id, id)).limit(1);
  if (!backup) return NextResponse.json({ success: false, error: 'Backup not found' }, { status: 404 });
  return new NextResponse(JSON.stringify(backup.payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="learning-path-backup-${backup.id}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
