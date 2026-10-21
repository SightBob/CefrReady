import 'dotenv/config';

import { eq, sql } from 'drizzle-orm';

import { db } from '../src/db';
import { users } from '../src/db/schema';

/**
 * เปิด/ปิดสิทธิ์ AI Tutor ทีละบัญชีผ่านอีเมล — รันด้วยมือเท่านั้น
 *
 * การใช้งาน:
 *   npx tsx scripts/ai-tutor-access.ts grant someone@example.com
 *   npx tsx scripts/ai-tutor-access.ts revoke someone@example.com
 *
 * เงื่อนไขอื่นของธง (master env + rollout) อยู่ที่ src/lib/ai-tutor.ts
 * ใช้กับ DATABASE_URL ชุดไหนก็ตามที่ตั้งใน .env — จะยิงที่ฐานผลิตจริงให้ใส่ใจก่อน
 */
const usage = 'การใช้งาน: npx tsx scripts/ai-tutor-access.ts <grant|revoke> <อีเมล>';

async function main() {
  const [actionRaw, emailRaw] = process.argv.slice(2);
  const action = actionRaw?.trim().toLowerCase();
  const email = emailRaw?.trim();
  if ((action !== 'grant' && action !== 'revoke') || !email) {
    console.error(usage);
    process.exit(1);
  }

  const matches: { id: string; email: string }[] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);

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
