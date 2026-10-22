import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { withAdmin } from '@/lib/admin-route';
import { warnWithSummary } from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PER_PAGE = 20;
const MAX_BULK = 200;

const bulkSchema = z.object({
  action: z.enum(['grant', 'revoke']),
  emails: z.array(z.string().trim().min(3).max(320)).min(1).max(MAX_BULK),
}).strict();

/** ทำอีเมลให้เป็นรูปแบบมาตรฐาน (ตัดช่องว่าง + ตัวพิมพ์ใหญ่) */
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ความยาวสูงสุดของคอลัมน์ target ในตาราง ai_tutor_admin_audit (varchar 200) */
const AUDIT_TARGET_MAX = 200;

/**
 * สรุปสำหรับ audit — ไม่เก็บอีเมลผู้เรียน (เก็บแค่จำนวน + ประเภท)
 * และตัดไม่เกินความยาวของคอลัมน์เสมอ (กัน insert ล้ม 22001)
 */
function buildAuditTarget(action: 'grant' | 'revoke', count: number): string {
  return `${action}:${count} users`.slice(0, AUDIT_TARGET_MAX);
}

/**
 * GET /api/admin/ai-tutor/testers?q=&page=
 * รายชื่อผู้ที่มีสิทธิ์ใช้ AI Tutor (users.ai_tutor_access = true)
 * ค้นหาด้วยอีเมล (ไม่สนตัวพิมพ์) + แบ่งหน้า
 */
export async function GET(request: Request) {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-testers', maxRequests: 60 });
  if (error) return error;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

  const search = q ? `%${q}%` : null;
  const where = search
    ? and(eq(users.aiTutorAccess, true), ilike(users.email, search))
    : eq(users.aiTutorAccess, true);

  const [rows, totalRows] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, name: users.name, updatedAt: users.updatedAt })
      .from(users)
      .where(where)
      .orderBy(desc(users.updatedAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(users).where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;
  return Response.json({
    success: true,
    data: rows.map((row) => ({ id: row.id, email: row.email, name: row.name })),
    meta: { page, perPage: PER_PAGE, total, totalPages: Math.max(1, Math.ceil(total / PER_PAGE)) },
  });
}

/**
 * POST /api/admin/ai-tutor/testers — เพิ่ม/ถอนสิทธิ์แบบเหลายรายการ (สูงสุด 200 ต่อคำขอ)
 * คืนผลแยก: สำเร็จ / ไม่พบผู้ใช้ / มีสิทธิ์อยู่แล้ว (หรือไม่มีให้ถอน)
 */
export async function POST(request: Request) {
  const { error, session } = await withAdmin({ keySuffix: 'admin:ai-tutor-testers', maxRequests: 30 });
  if (error) return error;

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const tooMany = issue?.path?.includes('emails') && issue?.code === 'too_big';
    return Response.json(
      {
        success: false,
        error: tooMany
          ? `ใส่ได้สูงสุด ${MAX_BULK} อีเมลต่อคำขอ`
          : `คำขอไม่ถูกต้อง: ${issue?.message ?? 'ตรวจสอบอีเมลและ action'}`,
      },
      { status: 400 },
    );
  }

  const { action } = parsed.data;
  const emails = [...new Set(parsed.data.emails.map(normalizeEmail))];
  const invalid = emails.filter((email) => !EMAIL_RE.test(email));
  const valid = emails.filter((email) => EMAIL_RE.test(email));

  if (valid.length === 0) {
    return Response.json({ success: false, error: 'ไม่พบอีเมลที่ถูกต้องเลย' }, { status: 400 });
  }

  const found = await db
    .select({ id: users.id, email: users.email, access: users.aiTutorAccess })
    .from(users)
    .where(or(...valid.map((email) => eq(users.email, email))));

  const byEmail = new Map(found.map((row) => [row.email, row]));
  const granted: string[] = [];
  const notFound: string[] = [];
  const already: string[] = [];

  // ─── เปลี่ยนสิทธิ์ + บันทึก audit ในธุรกรรมเดียวกัน ───
  // ถ้า audit ล้ม (เช่น คอลัมน์สั้นเกิน/DB ล่ม) → สิทธิ์ที่ให้ไปทั้งชุดถูก rollback ด้วย
  // (เดิม: อัปเดตสิทธิ์ก่อน แล้วค่อย insert audit → ถ้า audit ล้ม สิทธิ์ค้างถูกให้ไปแล้ว)
  let changedUserIds: string[] = [];
  try {
    await db.transaction(async (tx) => {
      const grantedLocal: string[] = [];
      const notFoundLocal: string[] = [];
      const alreadyLocal: string[] = [];
      const changedLocal: string[] = [];

      for (const email of valid) {
        const user = byEmail.get(email);
        if (!user) {
          notFoundLocal.push(email);
          continue;
        }
        const alreadyHas = action === 'grant' ? user.access : !user.access;
        if (alreadyHas) {
          alreadyLocal.push(email);
          continue;
        }
        await tx
          .update(users)
          .set({ aiTutorAccess: action === 'grant', updatedAt: new Date() })
          .where(eq(users.id, user.id));
        grantedLocal.push(email);
        changedLocal.push(user.id);
      }

      // บันทึก audit ทุกการเปลี่ยน (เก็บ user id ไม่เก็บอีเมล → ไม่มี PII ในตาราง audit)
      if (changedLocal.length > 0) {
        const { aiTutorAdminAudit } = await import('@/db/schema');
        await tx.insert(aiTutorAdminAudit).values({
          actorUserId: session?.user?.id ?? null,
          action: action === 'grant' ? 'grant_testers' : 'revoke_testers',
          target: buildAuditTarget(action, changedLocal.length),
          before: { userIds: changedLocal },
          after: { userIds: changedLocal, aiTutorAccess: action === 'grant' },
        });
      }

      granted.push(...grantedLocal);
      notFound.push(...notFoundLocal);
      already.push(...alreadyLocal);
      changedUserIds = changedLocal;
    });
  } catch (error) {
    // log เฉพาะชื่อ error + code (ไม่ log error object ทั้งก้อน — params ของ query
    // อาจเป็นอีเมล/คำถามของผู้เรียน) → ใช้ตัวช่วยกลางของ AI Tutor
    warnWithSummary('admin/ai-tutor/testers] เปลี่ยนสิทธิ์ไม่สำเร็จ — ยกเลิกทั้งชุด', error);
    return Response.json(
      { success: false, error: 'บันทึกการเปลี่ยนสิทธิ์ไม่สำเร็จ — ไม่มีการเปลี่ยนแปลงใด ๆ (ลองใหม่อีกครั้ง)' },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
    data: {
      granted,
      notFound,
      already,
      invalid,
      summary: {
        requested: emails.length,
        granted: granted.length,
        notFound: notFound.length,
        already: already.length,
        invalid: invalid.length,
      },
    },
  });
}
