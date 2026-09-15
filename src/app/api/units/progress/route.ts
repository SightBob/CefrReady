import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { learningNodeProgress } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateOrigin } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  nodeId: z.number().int().positive(),
  completed: z.boolean().default(true),
});

/** GET /api/units/progress — completed UnitsPath nodes for the current user */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const rows = await db
      .select({ nodeId: learningNodeProgress.nodeId, completedAt: learningNodeProgress.completedAt })
      .from(learningNodeProgress)
      .where(eq(learningNodeProgress.userId, user.id));

    return NextResponse.json({
      success: true,
      data: {
        completedNodeIds: rows.filter((row) => row.completedAt !== null).map((row) => row.nodeId),
      },
    });
  } catch (error) {
    console.error('[units/progress] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch unit progress' }, { status: 500 });
  }
}

/** POST /api/units/progress — save one node's completion state */
export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid progress data' }, { status: 400 });
  }

  const { nodeId, completed } = parsed.data;
  const now = new Date();

  try {
    await db
      .insert(learningNodeProgress)
      .values({
        userId: user.id,
        nodeId,
        completedAt: completed ? now : null,
        lastVisitedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningNodeProgress.userId, learningNodeProgress.nodeId],
        set: {
          completedAt: completed ? now : null,
          lastVisitedAt: now,
          updatedAt: now,
        },
      });

    return NextResponse.json({ success: true, data: { nodeId, completed } });
  } catch (error) {
    console.error('[units/progress] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save unit progress' }, { status: 500 });
  }
}
