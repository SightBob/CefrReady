import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';

export async function GET() {
  try {
    const users = await db.select().from(schema.users);
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, image } = body;
    // Generate a unique ID for the user (for non-OAuth users)
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db.insert(schema.users).values({ id, email, name, image }).returning();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
