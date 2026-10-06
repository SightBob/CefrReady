import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { verbBanks } from '@/db/schema';
import { asc, ilike, or } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { firstVerbError, validateVerbEntry } from '@/lib/verb-bank';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

/** GET /api/admin/verb-banks — รายการคลังกริยา 3 ช่อง (ค้นหาได้ทั้ง 3 ช่อง) */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const search = new URL(request.url).searchParams.get('search')?.trim() ?? '';

    const where = search
      ? or(
          ilike(verbBanks.v1, `%${search}%`),
          ilike(verbBanks.v2, `%${search}%`),
          ilike(verbBanks.v3, `%${search}%`),
        )
      : undefined;

    const data = await db
      .select({
        id: verbBanks.id,
        v1: verbBanks.v1,
        v2: verbBanks.v2,
        v3: verbBanks.v3,
        createdAt: verbBanks.createdAt,
        updatedAt: verbBanks.updatedAt,
      })
      .from(verbBanks)
      .where(where)
      .orderBy(asc(verbBanks.id));

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error('[admin/verb-banks] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch verb bank' }, { status: 500 });
  }
}

/** POST /api/admin/verb-banks — เพิ่มกริยา 1 รายการ */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
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

    const [created] = await db
      .insert(verbBanks)
      .values(values)
      .onConflictDoNothing({ target: [verbBanks.v1, verbBanks.v2, verbBanks.v3] })
      .returning();

    // onConflictDoNothing คืนค่าว่างเมื่อชุด 3 ช่องนี้มีอยู่แล้ว
    if (!created) {
      return NextResponse.json(
        { success: false, error: `มี "${values.v1} / ${values.v2} / ${values.v3}" อยู่ในคลังแล้ว` },
        { status: 409 },
      );
    }

    revalidateTag('verb-banks', { expire: 0 });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[admin/verb-banks] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create verb entry' }, { status: 500 });
  }
}