const fs = require('fs');

// Manual CSV parser that handles quoted fields with commas and newlines
function parseCSV(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  const rows = [];
  let current = '';
  let inQuote = false;
  let row = [];
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuote) {
      if (ch === '"' && content[i+1] === '"') {
        current += '"';
        i += 2;
        continue;
      } else if (ch === '"') {
        inQuote = false;
        i++;
        continue;
      } else {
        current += ch;
        i++;
        continue;
      }
    }

    if (ch === '"') {
      inQuote = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(current.trim());
      current = '';
      i++;
      continue;
    }

    if (ch === '\n' && content[i-1] === '\r') {
      row.push(current.trim());
      current = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }

    if (ch === '\n') {
      row.push(current.trim());
      current = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Handle last field
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

const rows = parseCSV('questions (2).csv');
const headers = rows[0];
const data = rows.slice(1).filter(r => r.length >= 8);

console.log(`Headers: ${headers.length}`);
console.log(`Data rows: ${data.length}`);
console.log('---');

// Output each question with key fields
for (const row of data) {
  const q = {};
  headers.forEach((h, idx) => {
    q[h] = idx < row.length ? row[idx] : '';
  });

  const id = q.id;
  const testType = q.test_type_id;
  const questionText = (q.question_text || '').substring(0, 200);
  const optA = (q.option_a || '').substring(0, 100);
  const optB = (q.option_b || '').substring(0, 100);
  const optC = (q.option_c || '').substring(0, 100);
  const optD = (q.option_d || '').substring(0, 100);
  const answer = q.correct_answer;
  const expl = (q.explanation || '').substring(0, 200);
  const conv = (q.conversation || '').substring(0, 300);
  const transcript = (q.transcript || '').substring(0, 200);
  const article = (q.article || '').substring(0, 300);
  const level = q.cefr_level;
  const difficulty = q.difficulty;
  const active = q.active;

  console.log(`=== ID:${id} | Type:${testType} | Level:${level} | Diff:${difficulty} | Active:${active} ===`);
  console.log(`Q: ${questionText}`);
  if (optA) console.log(`A: ${optA}`);
  if (optB) console.log(`B: ${optB}`);
  if (optC) console.log(`C: ${optC}`);
  if (optD) console.log(`D: ${optD}`);
  console.log(`ANSWER: ${answer}`);
  console.log(`EXPL: ${expl}`);
  if (conv && conv.length > 2) console.log(`CONV: ${conv}`);
  if (transcript && transcript.length > 2) console.log(`TRAN: ${transcript}`);
  if (article && article.length > 2) console.log(`ART: ${article}`);
  console.log('');
}
