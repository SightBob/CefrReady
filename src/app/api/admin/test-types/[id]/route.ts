import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testTypes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const testType = await db
      .select()
      .from(testTypes)
      .where(eq(testTypes.id, params.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!testType) {
      return NextResponse.json({ error: 'Test type not found' }, { status: 404 });
    }

    return NextResponse.json(testType);
  } catch (error) {
    console.error('Error fetching test type:', error);
    return NextResponse.json({ error: 'Failed to fetch test type' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await request.json();
    const { name, description, duration, icon, color, questionCount, active } = body;

    const [updated] = await db
      .update(testTypes)
      .set({
        name,
        description,
        duration: duration ? parseInt(duration) : null,
        icon: icon || null,
        color: color || null,
        questionCount: questionCount ? parseInt(questionCount) : null,
        active: active || 'true',
        updatedAt: new Date(),
      })
      .where(eq(testTypes.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Test type not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating test type:', error);
    return NextResponse.json({ error: 'Failed to update test type' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const [deleted] = await db
      .delete(testTypes)
      .where(eq(testTypes.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Test type not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Test type deleted' });
  } catch (error) {
    console.error('Error deleting test type:', error);
    return NextResponse.json({ error: 'Failed to delete test type' }, { status: 500 });
  }
}