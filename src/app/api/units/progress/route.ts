import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { learningNodeProgress } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateOrigin } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  nodeId: z.number().int().positive(),
  completed: z.boolean().default(true),
  // visit: true = the learner opened the node; touch lastVisitedAt WITHOUT
  // touching completedAt (a completed node stays completed on re-visits).
  visit: z.boolean().optional(),
});

/** GET /api/units/progress — completed UnitsPath nodes + last visited node for the current user */
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

    // Most recently visited node — powers the "เรียนต่อจากเดิม" card on /units.
    const [lastVisited] = await db
      .select({ nodeId: learningNodeProgress.nodeId })
      .from(learningNodeProgress)
      .where(eq(learningNodeProgress.userId, user.id))
      .orderBy(desc(learningNodeProgress.lastVisitedAt))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        completedNodeIds: rows.filter((row) => row.completedAt !== null).map((row) => row.nodeId),
        lastVisitedNodeId: lastVisited?.nodeId ?? null,
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

  const { nodeId, completed, visit } = parsed.data;
  const now = new Date();

  try {
    if (visit) {
      // Pure visit marker: insert if missing, otherwise only touch
      // lastVisitedAt. completedAt is intentionally untouched.
      await db
        .insert(learningNodeProgress)
        .values({
          userId: user.id,
          nodeId,
          completedAt: null,
          lastVisitedAt: now,
        })
        .onConflictDoUpdate({
          target: [learningNodeProgress.userId, learningNodeProgress.nodeId],
          set: {
            lastVisitedAt: now,
            updatedAt: now,
          },
        });

      return NextResponse.json({ success: true, data: { nodeId, visit: true } });
    }

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
