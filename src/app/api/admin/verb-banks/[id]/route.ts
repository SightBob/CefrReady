import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { verbBanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { firstVerbError, validateVerbEntry } from '@/lib/verb-bank';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/verb-banks/[id] — แก้ไขกริยา 1 รายการ (ครบทั้ง 3 ช่อง) */
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const verbId = Number.parseInt(id, 10);
    if (!Number.isInteger(verbId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const { values, errors } = validateVerbEntry({
      v1: body?.v1,
      v2: body?.v2,
      v3: body?.v3,
    });

    if (!values) {
      return NextResponse.json(
        { success: false, error: firstVerbError(errors) ?? 'ข้อมูลไม่ถูกต้อง', errors },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(verbBanks)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(verbBanks.id, verbId))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    // 23505 = unique_violation → ชุด 3 ช่องซ้ำกับรายการอื่น
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
      return NextResponse.json(
        { success: false, error: 'มีกริยาชุดนี้อยู่ในคลังแล้ว' },
        { status: 409 },
      );
    }
    console.error('[admin/verb-banks/[id]] PUT error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/verb-banks/[id] — ลบกริยา 1 รายการ */
export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const verbId = Number.parseInt(id, 10);
    if (!Number.isInteger(verbId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(verbBanks)
      .where(eq(verbBanks.id, verbId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deleted });
  } catch (err) {
    console.error('[admin/verb-banks/[id]] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}