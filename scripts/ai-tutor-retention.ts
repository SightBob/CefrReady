import 'dotenv/config';

import {
  applyRetention,
  countRetentionTargets,
  parseRetentionArgs,
  retentionCutoff,
} from '../src/lib/ai-tutor/retention';

/**
 * AI Tutor retention — ล้างข้อมูลเก่า (อ่าน/เขียนตามโหมด)
 *
 * โหมดปกติ = dry-run: แสดงจำนวนแถวที่จะถูกลบ แล้วจบ (ไม่ลบอะไรเลย)
 * ต้องใส่ --apply จึงลบจริง
 *
 * ใช้:
 *   npx tsx scripts/ai-tutor-retention.ts                 # dry-run
 *   npx tsx scripts/ai-tutor-retention.ts --apply         # ลบจริง
 *   npx tsx scripts/ai-tutor-retention.ts --apply --blank # เว้นว่าง content แทนการลบแถว
 *   AI_TUTOR_RETENTION_DAYS=90 npx tsx scripts/ai-tutor-retention.ts
 */
async function main() {
  const { days, apply, blank } = parseRetentionArgs(process.argv.slice(2));
  const cutoff = retentionCutoff(days);

  const targets = await countRetentionTargets(cutoff);

  console.log(`\n=== AI Tutor retention (เก่ากว่า ${days} วัน · ก่อน ${cutoff.toISOString()}) ===`);
  console.log(`- ข้อความที่เก่ากว่านั้น: ${targets.messages} แถว`);
  console.log(`- feedback ที่ผูกกับข้อความเก่า: ${targets.feedback} แถว`);
  console.log(`- โหมด: ${apply ? (blank ? 'ลบจริง (เว้นว่าง content)' : 'ลบจริง') : 'dry-run (ไม่ลบอะไร)'}`);

  if (!apply) {
    console.log('\nยังไม่ได้ลบอะไร — ใส่ --apply เพื่อลบจริง (หรือ --blank เพื่อเว้นว่าง content แทนการลบแถว)');
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
