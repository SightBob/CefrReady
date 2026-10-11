import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

/**
 * ข้อความโจทย์/เฉลย "ติดกัน" — ในข้อมูลจริงมีทั้ง `...your hand?Girl: I cut it...`
 * และ `...you got?Man: About thirty.` คือจบประโยคแล้วชนกับคำถัดไปเลย
 * (ไม่มีทั้งเว้นวรรคและขึ้นบรรทัดใหม่) จึงเป็นปัญหาที่ "ข้อมูล" ไม่ใช่ renderer
 *
 * สคริปต์นี้เติมช่องว่างเดียวหลังเครื่องหมายจบประโยคที่ชนกับตัวอักษรต่อเนื่องกัน
 * กติกาแคบโดยตั้งใจ (ไม่แตะ camelCase/โดเมน/ทศนิยม เพราะตัวอักษรที่ตามต้องเป็น
 * ตัวใหญ่หรืออักษรไทยเท่านั้น) — ค่าเริ่มต้นเป็น dry-run ต้องใส่ --apply จึงเขียน DB
 *
 *   npx tsx scripts/normalize-glued-text.ts            # ดูรายงานก่อน
 *   npx tsx scripts/normalize-glued-text.ts --apply    # เขียนจริง
 */

// เครื่องหมายจบประโยค (+ เครื่องหมายคำพูด/วงเล็บที่ปิดประโยค) ชนกับอักษรละตินตัวใหญ่
// อักษรไทยถูกตัดออกโดยตั้งใจ: เคสที่เจอในข้อมูลคือ "ผญ." (คำย่อ) และ "ไม่มี...เลย"
// ซึ่งการเติมช่องว่างเป็นรสนิยมการเขียน ไม่ใช่ข้อความที่ติดกันจนอ่านผิด
const GLUE_SAFE = /([.?!…]["'”’)\]]*)(?=[A-Z])/g;
// นับไว้รายงานเท่านั้น: เครื่องหมายจบประโยคชนกับอักษรไทย (ยังไม่แก้)
const GLUE_THAI = /([.?!…]["'”’)\]]*)(?=[\u0E00-\u0E7F])/g;
// กติกากว้าง (รายงานไว้เทียบ ยังไม่ใช้แก้): ตัวพิมพ์เล็ก/ตัวเลขชนกับตัวพิมพ์ใหญ่
const GLUE_BROAD = /([a-z0-9)]["'”’]?)(?=[A-Z\u0E00-\u0E7F])/g;

/** ตัดข้อความรอบจุดแก้ พร้อมป้าย [HERE] ตรงตำแหน่งที่เติมช่องว่าง */
const preview = (value: string, index: number, span = 42) =>
  `${value.slice(Math.max(0, index - span), index)}[HERE]${value.slice(index, index + span)}`.replace(/\n/g, '\\n');

/** เติมช่องว่างหลังเครื่องหมายจบประโยคที่ชนกับคำถัดไป และคืนตำแหน่งที่แก้ */
function normalize(value: string | null): { next: string; fixes: number[] } {
  if (!value) return { next: value ?? '', fixes: [] };
  const fixes: number[] = [];
  // args ของ replace: (match, capture1, …, offset, string) — offset อยู่หลัง capture
  const next = value.replace(GLUE_SAFE, (match: string, _capture: string, offset: number) => {
    fixes.push(offset + match.length);
    return `${match} `;
  });
  return { next, fixes };
}

async function main() {
  const apply = process.argv.includes('--apply');

  const rows = await db.execute(sql`
    SELECT id, question_text, explanation
    FROM questions
    ORDER BY id
  `);

  const list = process.argv.includes('--list');
  const changed: { id: number; field: 'question_text' | 'explanation'; before: string; after: string }[] = [];

  let broadLeftover = 0;
  let skippedThai = 0;
  const broadSamples: string[] = [];
  let scannedText = 0;
  let scannedExplain = 0;
  let gluedText = 0;
  let gluedExplain = 0;
  const examples: string[] = [];

  for (const row of rows.rows as { id: number; question_text: string | null; explanation: string | null }[]) {
    for (const field of ['question_text', 'explanation'] as const) {
      const before = row[field];
      if (field === 'question_text') scannedText++;
      else scannedExplain++;
      if (!before) continue;

      // นับสองตัวชี้วัดนี้ทุกแถวก่อนข้าม (ไม่ใช่เฉพาะแถวที่มีจุดแก้)
      skippedThai += (before.match(GLUE_THAI) ?? []).length;
      const { next, fixes } = normalize(before);
      for (const broad of next.match(GLUE_BROAD) ?? []) {
        broadLeftover++;
        if (broadSamples.length < 3) {
          broadSamples.push(preview(next, next.indexOf(broad) + broad.length, 24));
        }
      }
      if (fixes.length === 0) continue;
      if (field === 'question_text') gluedText++;
      else gluedExplain++;

      if (examples.length < 6) {
        examples.push(`#${row.id} ${field} @${fixes[0]}: …${preview(before, fixes[0])}…`);
      }



      changed.push({ id: row.id, field, before, after: next });
    }
  }

  const totalFixes = changed.length;
  const perField = {
    question_text: changed.filter((c) => c.field === 'question_text').length,
    explanation: changed.filter((c) => c.field === 'explanation').length,
  };  if (list) {
    for (const c of changed) {
      const before = c.before;
      const spots: string[] = [];
      GLUE_SAFE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = GLUE_SAFE.exec(before)) && spots.length < 4) {
        spots.push(preview(before, m.index + m[1].length, 30));
      }
      console.log(`#${c.id} ${c.field}: ${spots.join(' || ')}`);
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    scanned: { question_text: scannedText, explanation: scannedExplain },
    rowsWithGlue: { question_text: gluedText, explanation: gluedExplain },
    rowsToUpdate: perField,
    substitutions: totalFixes,
    skippedThaiAfterPunctuation: skippedThai,
    broadPatternLeftovers: broadLeftover,
    broadPatternSamples: broadSamples,
    examples,
  }, null, 2));

  if (changed.length === 0) {
    console.log('ไม่มีการแก้ไข');
    process.exit(0);
  }

  if (!apply) {
    console.log('\n(dry-run) ยังไม่เขียน DB — ใส่ --apply เพื่อบันทึกจริง');
    process.exit(0);
  }

  // เก็บค่าเดิมทั้งหมดไว้ก่อนเขียน เพื่อให้ย้อนกลับได้ถ้าตัวอย่างใดดูไม่ถูก
  const rollbackPath = path.join(__dirname, 'glued-text-rollback.json');
  writeFileSync(rollbackPath, JSON.stringify(changed.map((c) => ({
    id: c.id,
    field: c.field,
    previous: c.before,
  })), null, 2));
  console.log(`ค่าเดิมสำรองไว้ที่ ${rollbackPath}`);

  await db.transaction(async (tx) => {
    for (const c of changed) {
      await tx.execute(sql`
        UPDATE questions
        SET ${sql.raw(c.field)} = ${c.after},
            updated_at = now()
        WHERE id = ${c.id}
      `);
    }
  });

  console.log(`\nอัปเดตแล้ว ${changed.length} แถว (${totalFixes} จุด)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
