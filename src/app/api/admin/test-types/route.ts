import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testTypes } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const allTestTypes = await db.select().from(testTypes).orderBy(desc(testTypes.createdAt));

    return NextResponse.json(allTestTypes);
  } catch (error) {
    console.error('Error fetching test types:', error);
    return NextResponse.json({ error: 'Failed to fetch test types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, title, description, duration, icon, colorScheme } = body;

    if (!slug || !title || !description || !duration || !icon || !colorScheme) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newTestType] = await db.insert(testTypes).values({
      slug,
      title,
      description,
      duration,
      icon,
      colorScheme,
      isActive: true,
    }).returning();

    return NextResponse.json(newTestType, { status: 201 });
  } catch (error) {
    console.error('Error creating test type:', error);
    return NextResponse.json({ error: 'Failed to create test type' }, { status: 500 });
  }
}
