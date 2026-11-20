import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, users } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { withAdmin } from '@/lib/admin-route';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/admin-identity';

export const dynamic = 'force-dynamic';

/** GET — รายการผลสอบ (attempt ที่ส่งแล้ว) ของผู้ใช้คนนี้ ให้แอดมินเปิดหน้า /review ได้ */
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await withAdmin({ keySuffix: 'admin:users:[id]:attempts', maxRequests: 60 });
  if (error) return error;

  try {
    const attempts = await db
      .select({
        id: testAttempts.id,
        testTypeId: testAttempts.testTypeId,
        score: testAttempts.score,
        correctAnswers: testAttempts.correctAnswers,
        totalQuestions: testAttempts.totalQuestions,
        completedAt: testAttempts.completedAt,
      })
      .from(testAttempts)
      .where(and(eq(testAttempts.userId, params.id), eq(testAttempts.status, 'completed')))
      .orderBy(desc(testAttempts.completedAt))
      .limit(50);

    return NextResponse.json({ success: true, data: attempts });
  } catch (err) {
    console.error('[admin/users/[id]] attempts error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load attempts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, session } = await withAdmin({ keySuffix: 'admin:users:[id]', maxRequests: 60 });
  if (error) return error;

  const targetId = params.id;
  const callerId = session?.user?.id;  try {
    const body = await request.json();

    // PATCH accepts either { isAdmin } or { isTaster } — never both at once.
    const wantsAdmin = typeof body?.isAdmin === 'boolean';
    const wantsTaster = typeof body?.isTaster === 'boolean';

    if (wantsAdmin === wantsTaster) {
      return NextResponse.json(
        { success: false, error: 'Provide exactly one of isAdmin or isTaster' },
        { status: 400 }
      );
    }

    const nextValue = wantsAdmin ? body.isAdmin === true : body.isTaster === true;

    // Demoting the bootstrap admin would lock out the recovery path.
    const isPrivilegeRevocation = wantsAdmin && !nextValue;

    const target = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Block demoting the bootstrap admin (would lock out the only recovery path).
    if (target.email.toLowerCase() === DEFAULT_ADMIN_EMAIL && isPrivilegeRevocation) {
      return NextResponse.json(
        { success: false, error: 'Cannot revoke admin from the bootstrap admin email' },
        { status: 400 }
      );
    }

    // Block self-demotion to prevent accidental lockout.
    if (target.id === callerId && isPrivilegeRevocation) {
      return NextResponse.json(
        { success: false, error: 'Cannot revoke your own admin privilege' },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set(wantsAdmin ? { isAdmin: nextValue } : { isTaster: nextValue })
      .where(eq(users.id, targetId));

    return NextResponse.json({
      success: true,
      data: wantsAdmin
        ? { id: targetId, isAdmin: nextValue }
        : { id: targetId, isTaster: nextValue },
    });
  } catch (err) {
    console.error('[admin/users/[id]] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
