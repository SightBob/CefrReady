import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { learningPathBackups } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const backups = await db
    .select({ id: learningPathBackups.id, createdAt: learningPathBackups.createdAt })
    .from(learningPathBackups)
    .orderBy(asc(learningPathBackups.createdAt));
  return NextResponse.json({ success: true, data: backups });
}
