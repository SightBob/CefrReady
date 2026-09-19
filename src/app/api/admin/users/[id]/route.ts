import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { DEFAULT_ADMIN_EMAIL } from '@/lib/admin-identity';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, session } = await requireAdmin();
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
