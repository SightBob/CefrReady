/**
 * Read-only analysis: compare new lesson CSVs (focus on form) against DB.
 * Reports overlap, diffs, and set-23 coverage. No writes.
 *
 * Run: npx tsx scripts/analyze-lesson-csvs.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

const CSV_DIR = 'C:\\Users\\IHCK\\Downloads\\ข้อสอบ\\focus on form';

function normalizeText(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function dedupKey(row: {
  testTypeId: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
}): string {
  return [
    normalizeText(row.testTypeId),
    normalizeText(row.questionText),
    [row.optionA, row.optionB, row.optionC, row.optionD].map(normalizeText).join('|'),
  ].join('::');
}

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
  testSetId: string;
  lessonId: string;
}

async function main() {
  // 1. Load CSVs
  const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv')).sort();
  const rows: { row: CsvRow; file: string; line: number }[] = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(CSV_DIR, file), 'utf-8');
    const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
    parsed.data.forEach((row, i) => rows.push({ row, file, line: i + 2 }));
  }
  console.log(`CSV files: ${files.join(', ')}`);
  console.log(`Total CSV rows: ${rows.length}`);
  const perLesson = new Map<string, number>();
  rows.forEach(({ row }) => {
    const l = row.lessonId || '?';
    perLesson.set(l, (perLesson.get(l) ?? 0) + 1);
  });
  console.log('Rows per lessonId:', Object.fromEntries([...perLesson.entries()].sort()));

  // 2. In-file duplicates (across all lessons)
  const seen = new Map<string, string>();
  let inFileDupes = 0;
  for (const { row, file, line } of rows) {
    const key = dedupKey(row);
    if (seen.has(key)) {
      inFileDupes++;
      console.log(`  IN-FILE DUPE: ${file}:${line} == ${seen.get(key)}`);
    } else {
      seen.set(key, `${file}:${line}`);
    }
  }
  console.log(`In-file duplicates: ${inFileDupes}`);

  // 3. Load DB focus-form questions + set membership
  const dbRows = (await db.execute(sql`
    SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
           q.correct_answer, q.explanation, q.cefr_level, q.active,
           COALESCE(string_agg(ts.id::text, ',' ORDER BY ts.order_index), '(no set)') AS set_ids
    FROM questions q
    LEFT JOIN test_set_questions tsq ON tsq.question_id = q.id
    LEFT JOIN test_sets ts ON ts.id = tsq.test_set_id AND ts.section_id = 'focus-form'
    WHERE q.test_type_id = 'focus-form'
    GROUP BY q.id
  `)).rows as Array<{
    id: number; question_text: string; option_a: string; option_b: string;
    option_c: string; option_d: string; correct_answer: string;
    explanation: string; cefr_level: string; active: string; set_ids: string;
  }>;

  const dbByKey = new Map<string, typeof dbRows[number]>();
  for (const q of dbRows) {
    dbByKey.set(dedupKey({
      testTypeId: 'focus-form', questionText: q.question_text,
      optionA: q.option_a, optionB: q.option_b, optionC: q.option_c, optionD: q.option_d,
    }), q);
  }

  // 4. Match CSV → DB
  let matched = 0;
  const matchedDbIds = new Set<number>();
  const diffs: string[] = [];
  const unmatched: string[] = [];
  for (const { row, file, line } of rows) {
    const key = dedupKey(row);
    const dbq = dbByKey.get(key);
    if (!dbq) {
      unmatched.push(`${file}:${line} :: ${row.questionText.slice(0, 70)}`);
      continue;
    }
    matched++;
    matchedDbIds.add(dbq.id);
    if (normalizeText(row.correctAnswer) !== normalizeText(dbq.correct_answer)) {
      diffs.push(`${file}:${line} ANSWER csv=${row.correctAnswer} db=${dbq.correct_answer} :: ${row.questionText.slice(0, 50)}`);
    }
    if (normalizeText(row.cefrLevel) !== normalizeText(dbq.cefr_level)) {
      diffs.push(`${file}:${line} CEFR csv=${row.cefrLevel} db=${dbq.cefr_level} :: ${row.questionText.slice(0, 50)}`);
    }
    if (normalizeText(row.explanation) !== normalizeText(dbq.explanation)) {
      diffs.push(`${file}:${line} EXPLANATION differs :: ${row.questionText.slice(0, 50)}`);
    }
  }
  console.log(`\nMatched to DB: ${matched}/${rows.length}`);
  console.log(`Unmatched (not in DB): ${unmatched.length}`);
  unmatched.forEach(u => console.log(`  NEW: ${u}`));
  console.log(`\nContent diffs on matched: ${diffs.length}`);
  diffs.slice(0, 40).forEach(d => console.log(`  DIFF: ${d}`));
  if (diffs.length > 40) console.log(`  ... and ${diffs.length - 40} more`);

  // 5. DB focus-form questions NOT covered by CSV, grouped by set
  const notCovered = dbRows.filter(q => !matchedDbIds.has(q.id));
  const bySet = new Map<string, number>();
  for (const q of notCovered) {
    bySet.set(q.set_ids, (bySet.get(q.set_ids) ?? 0) + 1);
  }
  console.log(`\nDB focus-form questions NOT in CSV: ${notCovered.length} (of ${dbRows.length})`);
  console.log('Grouped by old set:', Object.fromEntries([...bySet.entries()].sort()));

  // 6. Old sets 15-22 coverage check: questions in those sets not in CSV
  const oldSetQs = dbRows.filter(q => q.set_ids !== '(no set)' && q.set_ids.split(',').some(s => ['15','16','17','18','19','20','21','22'].includes(s)));
  const oldSetCovered = oldSetQs.filter(q => matchedDbIds.has(q.id)).length;
  console.log(`\nQuestions in old sets 15-22: ${oldSetQs.length}, covered by CSV: ${oldSetCovered}, dropped: ${oldSetQs.length - oldSetCovered}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
