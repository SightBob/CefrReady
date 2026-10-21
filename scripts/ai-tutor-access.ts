import 'dotenv/config';

import { eq, sql } from 'drizzle-orm';

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { checkScriptWriteGuards, extractScriptFlags } from '../src/lib/ai-tutor/script-guard';

/**
 * เปิด/ปิดสิทธิ์ AI Tutor ทีละบัญชีผ่านอีเมล — รันด้วยมือเท่านั้น
 *
 * การใช้งาน:
 *   npx tsx scripts/ai-tutor-access.ts grant someone@example.com            # dry-run (ไม่เขียน)
 *   npx tsx scripts/ai-tutor-access.ts grant someone@example.com --apply --confirm-host <host>
 *   npx tsx scripts/ai-tutor-access.ts revoke someone@example.com --apply --confirm-host <host>
 *
 * เงื่อนไขอื่นของธง (master env + rollout) อยู่ที่ src/lib/ai-tutor.ts
 * ใช้กับ DATABASE_URL ชุดไหนก็ตามที่ตั้งใน .env — จะยิงที่ฐานผลิตจริงให้ใส่ใจก่อน
 * (ค่าเริ่มต้มเป็น dry-run และต้องยืนยัน host → กันรันผิดฐาน)
 */
const usage = 'การใช้งาน: npx tsx scripts/ai-tutor-access.ts <grant|revoke> <อีเมล> [--apply --confirm-host <host>]';

async function main() {
  const { apply, confirmHost, rest } = extractScriptFlags(process.argv.slice(2));
  const [actionRaw, emailRaw] = rest;
  const action = actionRaw?.trim().toLowerCase();
  const email = emailRaw?.trim();
  if ((action !== 'grant' && action !== 'revoke') || !email) {
    console.error(usage);
    process.exit(1);
  }

  // ─── กันรันผิดฐาน: ค่าเริ่มต้ม = dry-run, ต้อง --apply + --confirm-host, host ในบล็อกลิสต์ = ปฏิเสธ ───
  const guard = checkScriptWriteGuards({
    apply,
    confirmHost,
    databaseUrl: process.env.DATABASE_URL,
    blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  });
  if (!guard.ok) {
    console.error(guard.message);
    process.exit(1);
  }

  const matches: { id: string; email: string }[] = guard.dryRun
    ? []
    : await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(sql`lower(${users.email}) = lower(${email})`);

  if (guard.dryRun) {
    // dry-run = ไม่แตะฐานข้อมูลเลย (แม้แค่อ่าน) → ปลอดภัย 100%
    console.log('─── เป้าหมาย (dry-run — ไม่ได้อ่านและไม่ได้เขียนฐานข้อมูล) ───');
    console.log(`host      : ${guard.host}`);
    console.log(`action    : ${action}`);
    console.log('\nใส่ --apply --confirm-host <host> เพื่อเขียนจริง');
    process.exit(0);
  }

  if (matches.length === 0) {
    // ไม่พิมพ์อีเมลลง console (log เก็บ PII) — บอกแค่ว่าไม่เจอ
    console.error('ไม่พบบัญชีที่ระบุ — ตรวจสอบอีเมลอีกครั้ง');
    process.exit(1);
  }

  const target = matches[0];

  await db
    .update(users)
    .set({ aiTutorAccess: action === 'grant' })
    .where(eq(users.id, target.id));

  // log แค่ user id — ไม่พิมพ์อีเมล (PII) ลง console
  console.log(
    action === 'grant'
      ? `✅ เปิด AI Tutor ให้ user id=${target.id} แล้ว`
      : `🚫 ถอนสิทธิ์ AI Tutor ของ user id=${target.id} แล้ว`,
  );
  process.exit(0);
}

void main();
