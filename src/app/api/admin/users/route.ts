import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, testAttempts, userProgress } from '@/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // All users with their test stats
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Test attempt counts per user
    const attemptCounts = await db
      .select({
        userId: testAttempts.userId,
        totalAttempts: count(),
        avgScore: sql<number>`ROUND(AVG(CAST(${testAttempts.score} AS NUMERIC)), 1)`,
        lastAttempt: sql<string>`MAX(${testAttempts.completedAt})`,
      })
      .from(testAttempts)
      .groupBy(testAttempts.userId);

    const attemptMap = new Map(attemptCounts.map((a) => [a.userId, a]));

    const usersWithStats = allUsers.map((user) => {
      const stats = attemptMap.get(user.id);
      return {
        ...user,
        totalAttempts: stats?.totalAttempts ?? 0,
        avgScore: stats?.avgScore ?? null,
        lastAttempt: stats?.lastAttempt ?? null,
      };
    });

    return NextResponse.json({ success: true, data: usersWithStats });
  } catch (err) {
    console.error('[admin/users] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users] Delete error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
