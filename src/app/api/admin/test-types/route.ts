import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testTypes } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const allTestTypes = await db.select().from(testTypes).orderBy(desc(testTypes.createdAt));

    return NextResponse.json(allTestTypes);
  } catch (error) {
    console.error('Error fetching test types:', error);
    return NextResponse.json({ error: 'Failed to fetch test types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await request.json();
    const { id, name, description, duration, icon, color, questionCount } = body;

    if (!id || !name || !description) {
      return NextResponse.json({ error: 'Missing required fields: id, name, and description are required' }, { status: 400 });
    }

    const [newTestType] = await db.insert(testTypes).values({
      id, // String identifier like 'focus-form'
      name,
      description,
      duration: duration ? parseInt(duration) : null,
      icon: icon || null,
      color: color || null,
      questionCount: questionCount ? parseInt(questionCount) : null,
      active: 'true',
    }).returning();

    return NextResponse.json(newTestType, { status: 201 });
  } catch (error) {
    console.error('Error creating test type:', error);
    return NextResponse.json({ error: 'Failed to create test type' }, { status: 500 });
  }
}
