/**
 * scripts/backfill-full-result-meta.ts — เติม normalized_score / cefr_level ให้ผล Full Test เก่า
 *
 * ทำไมต้องมี: คอลัมน์สองตัวนี้เพิ่งเพิ่ม (migration 0053) แถวที่ส่งก่อนหน้านั้นเป็น NULL
 * ทำให้ /progress ยังประมาณระดับจากเปอร์เซ็นต์คำตอบ (A1) ขณะที่หน้าผลสอบคำนวณจาก /120 (A2)
 *
 * ปลอดภัย:
 * - ค่าเริ่มต้น = dry-run (อ่านอย่างเดียว) ต้องใส่ --apply ถึงเขียน
 * - ต้องใส่ --confirm-host <host> ให้ตรงกับ DATABASE_URL
 * - อัปเดตเฉพาะ normalized_score / cefr_level — ไม่แตะ score/total_questions/คำตอบ/สถานะ
 * - ไม่ลบแถวใด ๆ
 */
import 'dotenv/config';

import { inArray, sql } from 'drizzle-orm';

import { db } from '../src/db';
import { questions } from '../src/db/schema';
import { calculateFullTestResult } from '../src/lib/full-test/result';
import type { AttemptPathEntry } from '../src/lib/full-test/state';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const confirmIndex = args.indexOf('--confirm-host');
const confirmHost = confirmIndex >= 0 ? (args[confirmIndex + 1] ?? '') : '';

async function main() {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    console.error('ไม่พบ DATABASE_URL');
    process.exit(1);
  }
  const host = new URL(rawUrl).hostname;

  if (apply && confirmHost.trim().toLowerCase() !== host.toLowerCase()) {
    console.error(`🚫 --confirm-host ไม่ตรงกับ host ใน DATABASE_URL (${host})`);
    process.exit(1);
  }

  const rows = await db.execute(sql`
    SELECT id, adaptive_path, normalized_score, cefr_level
    FROM test_attempts
    WHERE test_type_id = 'full-test' AND status = 'completed' AND adaptive_path IS NOT NULL
    ORDER BY id
  `);
  const attempts = rows.rows as Array<{
    id: number;
    adaptive_path: AttemptPathEntry[];
    normalized_score: number | null;
    cefr_level: string | null;
  }>;

  const legacyIds = [
    ...new Set(
      attempts.flatMap((row) =>
        (row.adaptive_path ?? []).filter((entry) => !entry.questionSnapshot).map((entry) => entry.questionId),
      ),
    ),
  ];
  const legacyQuestions = legacyIds.length
    ? await db.select().from(questions).where(inArray(questions.id, legacyIds))
    : [];

  const planned: Array<{
    id: number;
    from: { normalized: number | null; level: string | null };
    to: { normalized: number; level: string; totalQuestions: number; correctAnswers: number };
  }> = [];

  for (const row of attempts) {
    const result = calculateFullTestResult(row.adaptive_path ?? [], legacyQuestions);
    if (row.normalized_score === result.normalizedScore && row.cefr_level === result.cefrLevel) continue;
    planned.push({
      id: row.id,
      from: { normalized: row.normalized_score, level: row.cefr_level },
      to: {
        normalized: result.normalizedScore,
        level: result.cefrLevel,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        host,
        mode: apply ? 'apply' : 'dry-run',
        scanned: attempts.length,
        toUpdate: planned.length,
        sample: planned.slice(0, 5),
      },
      null,
      1,
    ),
  );

  if (!apply) {
    console.log('dry-run — ยังไม่เขียนอะไร (ใส่ --apply --confirm-host <host> เพื่อบันทึกจริง)');
    process.exit(0);
  }
  if (planned.length === 0) {
    console.log('ไม่มีแถวที่ต้องอัปเดต');
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const item of planned) {
      await tx.execute(sql`
        UPDATE test_attempts
        SET normalized_score = ${item.to.normalized}, cefr_level = ${item.to.level}
        WHERE id = ${item.id}
      `);
    }
  });

  console.log(`อัปเดต ${planned.length} แถวแล้ว (ไม่แตะ score/total_questions/คำตอบ)`);
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ล้มเหลว: ${message.slice(0, 400)}`);
  process.exit(1);
});
