import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { withAdmin } from '@/lib/admin-route';
import { revalidateQuestionPool } from '@/lib/full-test/question-pool';

export const dynamic = 'force-dynamic';

/** เพดานหนึ่งคำขอ — กันส่ง id เป็นหมื่นเตือนจนชนขีดจำกัดของ PostgreSQL */
const MAX_IDS = 200;

const bodySchema = z.object({
  ids: z.array(z.unknown()).min(1, 'ids required'),
}).strict();

/** POST /api/admin/questions/bulk-delete — ลบหลายข้อในคำขอเดียว */
export async function POST(request: NextRequest) {
  const { error } = await withAdmin({ keySuffix: 'admin:questions:bulk-delete', maxRequests: 60 });
  if (error) return error;

  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'ids required' }, { status: 400 });
    }

    // กรองให้เหลือเฉพาะ id จำนวนเต็มบวกที่ไม่ซ้ำ
    const ids = Array.from(
      new Set(
        parsed.data.ids.filter(
          (id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0,
        )
      ),
    );
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid ids' }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { success: false, error: `Too many ids: ${ids.length}. Max: ${MAX_IDS}` },
        { status: 400 },
      );
    }

    // ผลเหมือน DELETE /api/admin/questions/[id] ทุกประการ — ปล่อยให้
    // FK cascade ของ test_set_questions ลบข้อที่ผูกอยู่เหมือนเดิม
    const deletedRows = await db.transaction(async (tx) =>
      tx.delete(questions).where(inArray(questions.id, ids)).returning({ id: questions.id }),
    );

    if (deletedRows.length === 0) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    revalidateQuestionPool();

    return NextResponse.json({
      success: true,
      data: {
        requested: ids.length,
        deleted: deletedRows.length,
        notFound: ids.length - deletedRows.length,
        // รายการที่ลบจริง ให้ฝั่งหน้าเว็บอัปเดตรายการได้ตรงกับผลจริง
        deletedIds: deletedRows.map((row) => row.id),
      },
    });
  } catch (err) {
    console.error('Error bulk deleting questions:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete questions' }, { status: 500 });
  }
}