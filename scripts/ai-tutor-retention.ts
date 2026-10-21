import 'dotenv/config';

import {
  applyRetention,
  countRetentionTargets,
  parseRetentionArgs,
  retentionCutoff,
} from '../src/lib/ai-tutor/retention';
import { checkScriptWriteGuards } from '../src/lib/ai-tutor/script-guard';

/**
 * AI Tutor retention — ล้างข้อมูลเก่า (อ่าน/เขียนตามโหมด)
 *
 * โหมดปกติ = dry-run: แสดงจำนวนแถวที่จะถูกลบ แล้วจบ (ไม่ลบอะไรเลย)
 * ต้องใส่ --apply และ --confirm-host <host ของ DATABASE_URL> จึงลบจริง
 * (ค่าเริ่มต้มเป็น dry-run + บล็อกลิสต์ APPLY_MIGRATION_BLOCKED_HOSTS → กันรันผิดฐาน)
 *
 * ใช้:
 *   npx tsx scripts/ai-tutor-retention.ts                 # dry-run
 *   npx tsx scripts/ai-tutor-retention.ts --apply --confirm-host <host>          # ลบจริง
 *   npx tsx scripts/ai-tutor-retention.ts --apply --blank --confirm-host <host>  # เว้นว่าง content แทนการลบแถว
 *   AI_TUTOR_RETENTION_DAYS=90 npx tsx scripts/ai-tutor-retention.ts
 */
async function main() {
  const { days, apply, blank, confirmHost } = parseRetentionArgs(process.argv.slice(2));
  const cutoff = retentionCutoff(days);

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

  // dry-run = อ่านอย่างเดียว (นับจำนวนแถวที่จะถูกลบ) — ไม่เขียนอะไร
  let targets = { messages: 0, feedback: 0 };
  let countFailed = false;
  try {
    targets = await countRetentionTargets(cutoff);
  } catch (error) {
    // นับไม่ได้ = ยังไม่ลบอะไร (ปลอดภัย) — แจ้งให้รู้ว่าไม่ได้ตัวเลข
    countFailed = true;
    console.warn('⚠️ นับจำนวนแถวไม่ได้ (ต่อฐานข้อมูลไม่สำเร็จ) — ยังไม่ได้ลบอะไร');
  }

  console.log(`\n=== AI Tutor retention (เก่ากว่า ${days} วัน · ก่อน ${cutoff.toISOString()}) ===`);
  console.log(`host              : ${guard.host}`);
  if (!countFailed) {
    console.log(`- ข้อความที่เก่ากว่านั้น: ${targets.messages} แถว`);
    console.log(`- feedback ที่ผูกกับข้อความเก่า: ${targets.feedback} แถว`);
  }
  console.log(`- โหมด: ${guard.dryRun ? 'dry-run (ไม่ลบอะไร)' : (blank ? 'ลบจริง (เว้นว่าง content)' : 'ลบจริง')}`);

  if (guard.dryRun) {
    console.log('\nยังไม่ได้ลบอะไร — ใส่ --apply --confirm-host <host> เพื่อลบจริง (หรือ --blank เพื่อเว้นว่าง content แทนการลบแถว)');
    process.exit(0);
  }

  const applied = await applyRetention(cutoff, blank);
  console.log(
    blank
      ? `\n✅ เว้นว่าง content ${applied.messages} แถว (คงโครงสร้างไว้เพื่อวิเคราะห์ย้อนหลัง)`
      : `\n✅ ลบข้อความ ${applied.messages} แถว + feedback ${applied.feedback} แถว`,
  );
  process.exit(0);
}

void main();
