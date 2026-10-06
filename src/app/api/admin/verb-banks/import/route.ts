import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { verbBanks } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { firstVerbError, validateVerbEntry } from '@/lib/verb-bank';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

/** จำกัดจำนวนแถวต่อการ import หนึ่งครั้ง กัน payload ใหญ่จน timeout */
export const MAX_IMPORT_ROWS = 5000;

interface ImportRow {
  line?: number;
  v1?: unknown;
  v2?: unknown;
  v3?: unknown;
}

/**
 * POST /api/admin/verb-banks/import — เพิ่มกริยาหลายแถวจากไฟล์ที่ import
 * กติกา: merge เท่านั้น (เพิ่มของใหม่ ไม่ลบ/แก้ของเดิม)
 * - แถวที่ชุด 3 ช่องมีอยู่แล้ว = นับเป็น "ซ้ำ" แล้วข้าม
 * - แถวที่ validate ไม่ผ่าน = รายงานเลขบรรทัดกลับไป โดยไม่หยุดแถวอื่น
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลให้นำเข้า' }, { status: 400 });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { success: false, error: `จำนวนแถวเกิน ${MAX_IMPORT_ROWS} แถวต่อครั้ง` },
        { status: 413 },
      );
    }

    const validValues: { v1: string; v2: string; v3: string }[] = [];
    const invalid: { line: number; message: string }[] = [];

    for (const row of rows) {
      const line = typeof row?.line === 'number' && Number.isFinite(row.line) ? row.line : 0;
      const { values, errors } = validateVerbEntry({ v1: row?.v1, v2: row?.v2, v3: row?.v3 });
      if (!values) {
        invalid.push({ line, message: firstVerbError(errors) ?? 'ข้อมูลไม่ถูกต้อง' });
        continue;
      }
      validValues.push(values);
    }

    // กันแถวซ้ำภายในไฟล์เดียวกัน (ชุด 3 ช่องเหมือนกัน)
    const seen = new Set<string>();
    const uniqueValues: typeof validValues = [];
    for (const values of validValues) {
      const key = `${values.v1}\u0000${values.v2}\u0000${values.v3}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueValues.push(values);
    }

    let inserted = 0;
    if (uniqueValues.length > 0) {
      const created = await db
        .insert(verbBanks)
        .values(uniqueValues)
        .onConflictDoNothing({ target: [verbBanks.v1, verbBanks.v2, verbBanks.v3] })
        .returning({ id: verbBanks.id });
      inserted = created.length;
    }

    if (inserted > 0) revalidateTag('verb-banks', { expire: 0 });

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        inserted,
        duplicates: validValues.length - uniqueValues.length,
        invalid,
      },
    });
  } catch (err) {
    console.error('[admin/verb-banks/import] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to import verb entries' }, { status: 500 });
  }
}
