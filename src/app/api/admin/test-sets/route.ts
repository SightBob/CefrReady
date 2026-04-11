import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSets, testTypes, testSetQuestions } from '@/db/schema';
import { eq, asc, count as drizzleCount } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/test-sets — list all sets grouped by section */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const sections = await db.select().from(testTypes).orderBy(asc(testTypes.id));
    const sets = await db
      .select({
        id: testSets.id,
        sectionId: testSets.sectionId,
        name: testSets.name,
        description: testSets.description,
        orderIndex: testSets.orderIndex,
        isActive: testSets.isActive,
        createdAt: testSets.createdAt,
        questionCount: drizzleCount(testSetQuestions.id),
      })
      .from(testSets)
      .leftJoin(testSetQuestions, eq(testSetQuestions.testSetId, testSets.id))
      .groupBy(testSets.id)
      .orderBy(asc(testSets.sectionId), asc(testSets.orderIndex));

    const grouped = sections.map((s) => ({
      ...s,
      testSets: sets.filter((ts) => ts.sectionId === s.id),
    }));

    return NextResponse.json({ success: true, data: grouped });
  } catch (err) {
    console.error('[admin/test-sets] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch test sets' }, { status: 500 });
  }
}

/** POST /api/admin/test-sets — create a new test set */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { sectionId, name, description } = await request.json();

    if (!sectionId || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'sectionId and name required' }, { status: 400 });
    }

    // Auto-increment order within section
    const existing = await db
      .select({ orderIndex: testSets.orderIndex })
      .from(testSets)
      .where(eq(testSets.sectionId, sectionId))
      .orderBy(asc(testSets.orderIndex));

    const nextOrder = existing.length > 0
      ? (existing[existing.length - 1].orderIndex ?? 0) + 1
      : 0;

    const [created] = await db
      .insert(testSets)
      .values({ sectionId, name: name.trim(), description: description?.trim() ?? null, orderIndex: nextOrder })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[admin/test-sets] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create test set' }, { status: 500 });
  }
}
