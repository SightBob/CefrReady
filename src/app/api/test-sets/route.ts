import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSets } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-sets?sectionId=focus-form
 * Auth-required endpoint: returns active test sets for a section.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sectionId = req.nextUrl.searchParams.get('sectionId');
  if (!sectionId) {
    return NextResponse.json({ success: false, error: 'Missing sectionId' }, { status: 400 });
  }

  try {
    const sets = await db
      .select({
        id: testSets.id,
        name: testSets.name,
        description: testSets.description,
        orderIndex: testSets.orderIndex,
      })
      .from(testSets)
      .where(and(eq(testSets.sectionId, sectionId), eq(testSets.isActive, true)))
      .orderBy(asc(testSets.orderIndex));

    return NextResponse.json({ success: true, data: sets });
  } catch (err) {
    console.error('[api/test-sets] Failed to list sets:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
