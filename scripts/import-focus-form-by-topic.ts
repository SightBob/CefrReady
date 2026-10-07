/**
 * นำเข้าข้อสอบ Focus on Form จาก CSV แล้วจัดเข้า Test Set ตาม grammarTopic
 *
 * Usage: npx tsx scripts/import-focus-form-by-topic.ts "<path-to.csv>"
 *
 * - จัดข้อสอบเป็น 11 ชุดตามกลุ่มเรื่องไวยากรณ์ (ดู BUNDLES)
 * - ใช้ชุดเดิมในพาร์ท focus-form เรียงตาม order_index (9 ชุด) แล้วตั้งชื่อ/คำอธิบายใหม่
 *   ที่เหลือสร้างชุดใหม่ต่อท้าย
 * - ข้อสอบถูกบันทึกพร้อม grammar_topic และผูกเข้าชุดด้วย order_index ตามลำดับเรื่องใน BUNDLES
 * - ทั้งหมดอยู่ใน transaction เดียว และกันการนำเข้าซ้ำ (ถ้าพาร์ทนี้มีข้ออยู่แล้วจะหยุดทันที)
 * - เขียน audit CSV ที่มี testSetId ครบไว้ที่ reports/focus-form-by-topic.csv
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../src/db';
import { questions, testSetQuestions, testSets } from '../src/db/schema';

const SECTION_ID = 'focus-form';
const VALID_CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

/** ชุดข้อสอบตามเรื่องไวยากรณ์ — เรียงจากพื้นฐานไปซับซ้อน (ลำดับนี้คือ order_index ของชุด) */
const BUNDLES: Array<{ name: string; description: string; topics: string[] }> = [
  {
    name: 'Present Simple & Present Continuous',
    description: 'เข้าใจรูปกริยาปัจจุบัน — Present Simple · Present Continuous',
    topics: ['Present Simple', 'Present Continuous'],
  },
  {
    name: 'Past, Perfect & Future Tenses',
    description: 'เทนส์อดีต-สมบูรณ์-อนาคต — Past Simple · Present Perfect · Past Perfect · Future Forms · Time Expressions',
    topics: ['Past Simple', 'Present Perfect', 'Past Perfect', 'Time Expressions', 'Future Forms'],
  },
  {
    name: 'Pronouns, Possessives & Articles',
    description: 'สรรพนามและคำนำหน้านาม — Pronouns & Possessives · Articles & Determiners',
    topics: ['Pronouns & Possessives', 'Articles & Determiners'],
  },
  {
    name: 'Quantifiers',
    description: 'คำบอกปริมาณ — some/any/much/many/enough และคำบอกจำนวนไม่ชี้เฉพาะ',
    topics: ['Quantifiers'],
  },
  {
    name: 'Adjectives, Adverbs & Comparison',
    description: 'คำคุณศัพท์ คำกริยาวิเศษณ์ และการเปรียบเทียบ — Adjectives & Adverbs · Comparatives & Superlatives',
    topics: ['Adjectives & Adverbs', 'Comparatives & Superlatives'],
  },
  {
    name: 'Modals & Auxiliaries',
    description: 'กริยาช่วยและกริยาแสดงมาลา — Modals & Semi-modals · Auxiliaries & Verb Forms',
    topics: ['Modals & Semi-modals', 'Auxiliaries & Verb Forms'],
  },
  {
    name: 'Gerunds, Infinitives, Passive & Agreement',
    description: 'รูปแบบกริยาต่อท้ายและประธาน-กริยา — Gerunds & Infinitives · Passive Voice · Subject-Verb Agreement',
    topics: ['Gerunds & Infinitives', 'Passive Voice', 'Subject-Verb Agreement'],
  },
  {
    name: 'Prepositions',
    description: 'บุพบทบอกสถานที่ เวลา และทิศทาง — in/on/at/to/for โดยละเอียด',
    topics: ['Prepositions'],
  },
  {
    name: 'Connectors, Conditionals & Clauses',
    description: 'คำเชื่อม เงื่อนไข และอนุประโยค — Conjunctions & Connectors · Conditionals · Relative Clauses · Reported Speech',
    topics: ['Conjunctions & Connectors', 'Conditionals', 'Relative Clauses', 'Reported Speech'],
  },
  {
    name: 'Question Forms & Tag Questions',
    description: 'โครงสร้างคำถามและ Question Tag — Wh-questions · How far/often · Tag Questions',
    topics: ['Question Forms', 'Tag Questions'],
  },
  {
    name: 'Phrasal Verbs & Collocations',
    description: 'กริยาวลีและคำที่ใช้ร่วมกันบ่อย — Phrasal Verbs · Vocabulary & Collocations',
    topics: ['Phrasal Verbs', 'Vocabulary & Collocations'],
  },
];

interface CsvRow {
  testTypeId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  cefrLevel: string;
  difficulty: string;
  grammarTopic: string;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function readCsv(filePath: string): CsvRow[] {
  if (!fs.existsSync(filePath)) fail(`ไม่พบไฟล์ CSV: ${filePath}`);
  const parsed = Papa.parse<Record<string, string>>(fs.readFileSync(filePath, 'utf8'), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    fail(`CSV parse error: ${JSON.stringify(parsed.errors.slice(0, 5))}`);
  }

  return parsed.data.map((raw, idx) => {
    const rowNo = idx + 2;
    const row: CsvRow = {
      testTypeId: (raw.testTypeId ?? '').trim(),
      questionText: (raw.questionText ?? '').trim(),
      optionA: (raw.optionA ?? '').trim(),
      optionB: (raw.optionB ?? '').trim(),
      optionC: (raw.optionC ?? '').trim(),
      optionD: (raw.optionD ?? '').trim(),
      correctAnswer: (raw.correctAnswer ?? '').trim().toUpperCase(),
      explanation: (raw.explanation ?? '').trim(),
      cefrLevel: (raw.cefrLevel ?? '').trim(),
      difficulty: (raw.difficulty ?? '').trim().toLowerCase() || 'medium',
      grammarTopic: (raw.grammarTopic ?? '').trim(),
    };

    if (row.testTypeId !== SECTION_ID) fail(`Row ${rowNo}: testTypeId ต้องเป็น "${SECTION_ID}" (พบ "${row.testTypeId}")`);
    if (!row.questionText) fail(`Row ${rowNo}: ไม่มี questionText`);
    for (const field of ['optionA', 'optionB', 'optionC', 'optionD'] as const) {
      if (!row[field]) fail(`Row ${rowNo}: ไม่มี ${field}`);
    }
    if (!['A', 'B', 'C', 'D'].includes(row.correctAnswer)) fail(`Row ${rowNo}: correctAnswer "${row.correctAnswer}" ต้องเป็น A–D`);
    if (!VALID_CEFR.includes(row.cefrLevel)) fail(`Row ${rowNo}: cefrLevel "${row.cefrLevel}" ไม่ถูกต้อง`);
    if (!VALID_DIFFICULTY.includes(row.difficulty)) fail(`Row ${rowNo}: difficulty "${row.difficulty}" ไม่ถูกต้อง`);
    if (row.grammarTopic.length === 0) fail(`Row ${rowNo}: ไม่มี grammarTopic`);
    if (row.grammarTopic.length > 200) fail(`Row ${rowNo}: grammarTopic ยาวเกิน 200 ตัวอักษร`);

    return row;
  });
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) fail('Usage: npx tsx scripts/import-focus-form-by-topic.ts "<path-to.csv>"');

  const rows = readCsv(csvPath);
  console.log(`อ่าน ${rows.length} ข้อจาก ${csvPath}`);

  // ── จัดกลุ่มตามเรื่อง ────────────────────────────────────────────────
  const byTopic = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const list = byTopic.get(row.grammarTopic);
    if (list) list.push(row);
    else byTopic.set(row.grammarTopic, [row]);
  }

  const seenText = new Set<string>();
  for (const row of rows) {
    if (seenText.has(row.questionText)) fail(`มี questionText ซ้ำในไฟล์: "${row.questionText.slice(0, 60)}…"`);
    seenText.add(row.questionText);
  }

  const planned = BUNDLES.map((bundle) => {
    const bundleRows: CsvRow[] = [];
    for (const topic of bundle.topics) {
      const list = byTopic.get(topic);
      if (!list) fail(`ไม่พบ grammarTopic "${topic}" ในไฟล์`);
      bundleRows.push(...list);
    }
    return { bundle, rows: bundleRows };
  });

  const unassigned = [...byTopic.keys()].filter((topic) => !BUNDLES.some((b) => b.topics.includes(topic)));
  if (unassigned.length > 0) fail(`grammarTopic ที่ยังไม่ถูกจัดเข้าชุด: ${unassigned.join(', ')}`);

  const plannedTotal = planned.reduce((sum, p) => sum + p.rows.length, 0);
  if (plannedTotal !== rows.length) fail(`นับข้อไม่ครบ: ${plannedTotal} vs ${rows.length}`);

  // ── ตรวจว่าไม่มีข้อเข้าชุดไปแล้ว (กันนำเข้าซ้ำ) ────────────────────────
  const [existingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questions)
    .where(eq(questions.testTypeId, SECTION_ID));
  if ((existingCount?.count ?? 0) > 0) {
    fail(`พาร์ท ${SECTION_ID} มีข้อสอบอยู่แล้ว ${existingCount.count} ข้อ — สคริปต์นี้ออกแบบให้รันครั้งเดียว (หยุดเพื่อกันซ้ำ)`);
  }

  const existingSets = await db
    .select({ id: testSets.id, name: testSets.name, orderIndex: testSets.orderIndex })
    .from(testSets)
    .where(eq(testSets.sectionId, SECTION_ID))
    .orderBy(asc(testSets.orderIndex));

  const reusedSets = existingSets.slice(0, BUNDLES.length);
  const newSetCount = Math.max(0, BUNDLES.length - reusedSets.length);
  console.log(`ชุดเดิมในพาร์ทนี้: ${existingSets.length} (ใช้ต่อ ${reusedSets.length}, สร้างใหม่ ${newSetCount})`);

  const setIds: number[] = [];

  await db.transaction(async (tx) => {
    for (let i = 0; i < BUNDLES.length; i++) {
      const bundle = BUNDLES[i];
      const orderIndex = i + 1;
      const reused = reusedSets[i];

      if (reused) {
        await tx
          .update(testSets)
          .set({ name: bundle.name, description: bundle.description, orderIndex, isActive: true })
          .where(eq(testSets.id, reused.id));
        console.log(`  ชุด ${orderIndex}: ใช้ id=${reused.id} (เดิม "${reused.name}") → "${bundle.name}"`);
        setIds.push(reused.id);
      } else {
        const [created] = await tx
          .insert(testSets)
          .values({ sectionId: SECTION_ID, name: bundle.name, description: bundle.description, orderIndex, isActive: true })
          .returning({ id: testSets.id });
        console.log(`  ชุด ${orderIndex}: สร้างใหม่ id=${created.id} → "${bundle.name}"`);
        setIds.push(created.id);
      }
    }

    // ── บันทึกข้อสอบทั้งหมด (ผูก grammarTopic มาด้วย) ──────────────────
    const inserted = await tx
      .insert(questions)
      .values(
        rows.map((row) => ({
          testTypeId: SECTION_ID,
          questionText: row.questionText,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctAnswer: row.correctAnswer,
          explanation: row.explanation,
          cefrLevel: row.cefrLevel,
          difficulty: row.difficulty,
          grammarTopic: row.grammarTopic,
        })),
      )
      .returning({ id: questions.id, questionText: questions.questionText });

    const idByText = new Map(inserted.map((q) => [q.questionText, q.id]));
    if (idByText.size !== rows.length) fail(`บันทึกข้อสอบได้ ${idByText.size} จาก ${rows.length} ข้อ`);

    // ── ผูกข้อเข้าชุดตามลำดับเรื่อง ──────────────────────────────────────
    const links: Array<{ testSetId: number; questionId: number; orderIndex: number }> = [];
    planned.forEach((plan, bundleIdx) => {
      plan.rows.forEach((row, inSetIndex) => {
        const questionId = idByText.get(row.questionText);
        if (!questionId) fail(`หา id ของข้อไม่เจอ: "${row.questionText.slice(0, 60)}…"`);
        links.push({ testSetId: setIds[bundleIdx], questionId, orderIndex: inSetIndex });
      });
    });

    await tx.insert(testSetQuestions).values(links);

    // ── audit CSV ───────────────────────────────────────────────────────
    const csvRows: Array<Record<string, string | number>> = [];
    planned.forEach((plan, bundleIdx) => {
      for (const row of plan.rows) {
        csvRows.push({
          testTypeId: row.testTypeId,
          questionText: row.questionText,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctAnswer: row.correctAnswer,
          explanation: row.explanation,
          cefrLevel: row.cefrLevel,
          difficulty: row.difficulty,
          grammarTopic: row.grammarTopic,
          testSetId: setIds[bundleIdx],
        });
      }
    });
    const outPath = path.join('reports', 'focus-form-by-topic.csv');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Papa.unparse(csvRows));
    console.log(`\nเขียน audit CSV: ${outPath} (${csvRows.length} ข้อ)`);
  });

  console.log('\n✓ นำเข้าสำเร็จ');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ ล้มเหลว (transaction ถูก rollback ทั้งหมด):', err);
  process.exit(1);
});
