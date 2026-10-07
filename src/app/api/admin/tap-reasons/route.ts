import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { questions, tapReasonSubmissions, testAttempts, testSets, users } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// จุดคะแนนมากสุดต่อเหตุผลหนึ่งข้อ — กันค่ามั่วจาก client/admin UI
const MAX_REWARD_POINTS = 100;

const patchSchema = z.object({
  id: z.number().int().positive(),
  rewardPoints: z.number().int().min(0).max(MAX_REWARD_POINTS).nullable(),
});

// รายการเหตุผลรอให้คะแนน — กรอง "ยังไม่ได้ให้คะแนน" ก่อน แล้วจึงของเก่าล่าสุด
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;  // "รอให้คะแนน" ต้องกรองที่ SQL ไม่ใช่หลัง limit(200) — ไม่งั้นรายการเก่าที่ค้างอยู่จะหายไป
  const showScored = req.nextUrl.searchParams.get('scored') === 'true';

  try {
    const rows = await db
      .select({
        id: tapReasonSubmissions.id,
        attemptId: tapReasonSubmissions.attemptId,
        userId: tapReasonSubmissions.userId,
        userName: users.name,
        userEmail: users.email,
        questionId: tapReasonSubmissions.questionId,
        itemIndex: tapReasonSubmissions.itemIndex,
        reason: tapReasonSubmissions.reason,
        isCorrect: tapReasonSubmissions.isCorrect,
        rewardPoints: tapReasonSubmissions.rewardPoints,
        scoredAt: tapReasonSubmissions.scoredAt,
        createdAt: tapReasonSubmissions.createdAt,
        questionText: questions.questionText,
        tapExercise: questions.tapExercise,
        setName: testSets.name,
      })
      .from(tapReasonSubmissions)
      .innerJoin(users, eq(users.id, tapReasonSubmissions.userId))
      .innerJoin(questions, eq(questions.id, tapReasonSubmissions.questionId))
      .innerJoin(testAttempts, eq(testAttempts.id, tapReasonSubmissions.attemptId))
      // attempt เก็บ testSetId ไว้แล้ว — ใช้ join ตรง ๆ ไม่ต้องผ่าน testSetQuestions
      .leftJoin(testSets, eq(testSets.id, testAttempts.testSetId))
      .where(showScored ? undefined : isNull(tapReasonSubmissions.rewardPoints))
      .orderBy(desc(tapReasonSubmissions.createdAt))
      .limit(200);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /api/admin/tap-reasons] error:', err);
    return NextResponse.json({ error: 'Failed to fetch tap reasons' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = patchSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: `rewardPoints ต้องเป็น 0-${MAX_REWARD_POINTS} หรือ null` }, { status: 400 });
    }
    const { id, rewardPoints } = body.data;

    const updated = await db
      .update(tapReasonSubmissions)
      .set({ rewardPoints, scoredAt: rewardPoints === null ? null : new Date() })
      .where(eq(tapReasonSubmissions.id, id))
      .returning({ id: tapReasonSubmissions.id, rewardPoints: tapReasonSubmissions.rewardPoints });

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('[PATCH /api/admin/tap-reasons] error:', err);
    return NextResponse.json({ error: 'Failed to update reward points' }, { status: 500 });
  }
}
