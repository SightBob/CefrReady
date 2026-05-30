const fs = require('fs');

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
      if (ch === '"' && content[i+1] === '"') { current += '"'; i += 2; continue; }
      else if (ch === '"') { inQuote = false; i++; continue; }
      else { current += ch; i++; continue; }
    }
    if (ch === '"') { inQuote = true; i++; continue; }
    if (ch === ',') { row.push(current.trim()); current = ''; i++; continue; }
    if (ch === '\n' && content[i-1] === '\r') { row.push(current.trim()); current = ''; rows.push(row); row = []; i++; continue; }
    if (ch === '\n') { row.push(current.trim()); current = ''; rows.push(row); row = []; i++; continue; }
    current += ch; i++;
  }
  if (current || row.length > 0) { row.push(current.trim()); rows.push(row); }
  return rows;
}

const rows = parseCSV('questions (2).csv');
const headers = rows[0];
const data = rows.slice(1).filter(r => r.length >= 8);

const questions = [];
for (const row of data) {
  const q = {};
  headers.forEach((h, idx) => { q[h] = idx < row.length ? row[idx] : ''; });
  questions.push(q);
}
questions.sort((a, b) => parseInt(a.id) - parseInt(b.id));

// Group by type
const byType = {};
for (const q of questions) {
  const t = q.test_type_id || 'unknown';
  if (!byType[t]) byType[t] = [];
  byType[t].push(q);
}

console.log('Question counts by type:');
for (const [type, qs] of Object.entries(byType)) {
  console.log(`  ${type}: ${qs.length}`);
}
console.log(`  TOTAL: ${questions.length}`);

// Save each type to a separate file for parallel review
for (const [type, qs] of Object.entries(byType)) {
  let output = `=== ${type.toUpperCase()} QUESTIONS (${qs.length} questions) ===\n\n`;

  for (const q of qs) {
    output += `\n--- ID:${q.id} [${q.cefr_level}/${q.difficulty}] ---\n`;

    if (q.question_text) output += `Q: ${q.question_text}\n`;

    // Options (only for non-form-meaning)
    if (type !== 'form-meaning') {
      if (q.option_a && q.option_a.trim() !== '') output += `A: ${q.option_a}\n`;
      if (q.option_b && q.option_b.trim() !== '') output += `B: ${q.option_b}\n`;
      if (q.option_c && q.option_c.trim() !== '') output += `C: ${q.option_c}\n`;
      if (q.option_d && q.option_d.trim() !== '') output += `D: ${q.option_d}\n`;
    }

    output += `ANSWER: ${q.correct_answer}\n`;

    if (q.explanation) output += `EXPL: ${q.explanation}\n`;

    if (q.conversation && q.conversation.trim() !== '' && q.conversation.trim() !== '{}') {
      output += `CONV: ${q.conversation}\n`;
    }

    if (q.transcript && q.transcript.trim() !== '') {
      output += `TRAN: ${q.transcript}\n`;
    }

    if (q.article && q.article.trim() !== '') {
      output += `ARTICLE: ${q.article}\n`;
    }
  }

  const filename = `review-${type}.txt`;
  fs.writeFileSync(filename, output, 'utf-8');
  console.log(`Saved: ${filename} (${output.length} bytes)`);
}
