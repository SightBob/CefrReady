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
    const { email, name } = body;
    const [user] = await db.insert(schema.users).values({ email, name }).returning();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
