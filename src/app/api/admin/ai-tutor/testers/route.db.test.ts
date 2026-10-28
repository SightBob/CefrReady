/**
 * ทดสอบกับ DB จริง: การเปลี่ยนสิทธิ์ (users.ai_tutor_access) + บันทึก audit
 * ต้องอยู่ใน **ธุรกรรมเดียวกัน** — ถ้า audit insert ล้มจริง สิทธิ์ต้องถูก rollback
 *
 * พิสูจน์ด้วยของจริง (ไม่ mock):
 * - ทำให้ audit insert ล้มด้วย FK จริงของฐานข้อมูล
 *   (ai_tutor_admin_audit_actor_user_id_fkey → users(id)) โดยส่ง actor ที่ไม่มีจริง
 * - อ่าน users.ai_tutor_access กลับจาก DB เพื่อยืนยันว่าไม่เปลี่ยน
 *
 * ข้ามอัตโนมัติถ้าไม่มี DATABASE_URL / host ไม่อยู่ใน allowlist (AI_TUTOR_TEST_DB_HOSTS)
 * หรืออยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS)
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const mocks = vi.hoisted(() => ({
  session: { user: { id: '' } } as { user: { id: string } },
}));

// คุม actor id ได้ (ปกติมาจาก session ของผู้ดูแล)
vi.mock('@/lib/admin-route', () => ({
  withAdmin: vi.fn(async () => ({ error: null, session: mocks.session })),
}));

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ignore — จะ skip ถ้าไม่มี DATABASE_URL
}

const { createTestDbUserId, evaluateTestDbGuard, importIfAllowed, testDbUserEmail } = await import('@/lib/test-db-guard');

const connectionString = process.env.DATABASE_URL;

const guard = evaluateTestDbGuard({
  databaseUrl: connectionString,
  blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  allowedHosts: process.env.AI_TUTOR_TEST_DB_HOSTS,
});
if (!guard.allowed) {
  console.warn(`[testers.route.db.test] ข้ามเทสที่ต่อ DB จริง: ${guard.reason}`);
}

// import หลังผ่าน guard เท่านั้น — src/db/index.ts throw เมื่อไม่มี DATABASE_URL
// และ ./route ก็ดึง @/db ต่อเป็นทอด ๆ
const { db } = await importIfAllowed(guard.allowed, () => import('@/db'));
const { aiTutorAdminAudit, users } = await importIfAllowed(guard.allowed, () => import('@/db/schema'));
const { POST } = await importIfAllowed(guard.allowed, () => import('./route'));

const describeLive = connectionString && guard.allowed ? describe : describe.skip;

function post(body: unknown) {
  return POST(new Request('http://localhost:3000/api/admin/ai-tutor/testers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describeLive('testers/route ↔ DB จริง — สิทธิ์ + audit อยู่ในธุรกรรมเดียวกัน', () => {
  let userId = '';
  let email = '';

  beforeAll(async () => {
    userId = createTestDbUserId('testers');
    email = testDbUserEmail(userId);
    await db.insert(users).values({ id: userId, email, name: 'AI Tutor Test (testers)' });
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(aiTutorAdminAudit).where(eq(aiTutorAdminAudit.actorUserId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  /** อ่านค่าสิทธิ์จริงจาก DB */
  async function readAccess(): Promise<boolean | null> {
    const rows = await db.select({ access: users.aiTutorAccess }).from(users).where(eq(users.id, userId)).limit(1);
    return rows[0]?.access ?? null;
  }

  it('audit insert ล้มจริง (FK ของ actor_user_id) → สิทธิ์ไม่เปลี่ยน (rollback ทั้งชุด)', async () => {
    // actor ที่ไม่มีอยู่จริงในตาราง users → insert audit ติด FK → error จริงจาก DB
    mocks.session.user.id = `ไม่มีผู้ใช้นี้-${Date.now()}`;

    const res = await post({ action: 'grant', emails: [email] });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    // ไม่เผยรายละเอียด error ของ DB ให้ผู้ใช้
    expect(JSON.stringify(body)).not.toContain('foreign key');

    // สิทธิ์ต้องยังเป็น false (ถูก rollback พร้อมกัน)
    expect(await readAccess()).toBe(false);

    // และต้องไม่มีแถว audit ค้าง
    const audits = await db
      .select({ id: aiTutorAdminAudit.id })
      .from(aiTutorAdminAudit)
      .where(eq(aiTutorAdminAudit.actorUserId, mocks.session.user.id));
    expect(audits).toHaveLength(0);
  });

  it('audit สำเร็จ → สิทธิ์เปลี่ยนจริง + มีแถว audit ที่ไม่เก็บอีเมล (commit ทำงานกับ driver นี้)', async () => {
    // actor ที่มีอยู่จริง → insert audit ผ่าน
    mocks.session.user.id = userId;

    const res = await post({ action: 'grant', emails: [email] });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.granted).toEqual([email]);

    // สิทธิ์เปลี่ยนจริงใน DB
    expect(await readAccess()).toBe(true);

    const audits = await db
      .select({
        target: aiTutorAdminAudit.target,
        before: aiTutorAdminAudit.before,
        after: aiTutorAdminAudit.after,
      })
      .from(aiTutorAdminAudit)
      .where(eq(aiTutorAdminAudit.actorUserId, userId));

    expect(audits).toHaveLength(1);
    expect(audits[0].target).toBe('grant:1 users');
    // ไม่มีอีเมลใน audit เลย (เก็บ user id)
    expect(JSON.stringify(audits[0])).not.toContain(email);
    expect(JSON.stringify(audits[0])).toContain(userId);
  });
});
