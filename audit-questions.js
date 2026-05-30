const fs = require('fs');

// Parse CSV with proper quote handling
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current);
        current = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        if (ch === '\r') i++; // skip \n in \r\n
      } else {
        current += ch;
      }
    }
  }
  // Last field/row
  row.push(current);
  if (row.length > 1 || row[0] !== '') rows.push(row);

  return rows;
}

const csv = fs.readFileSync('questions (2).csv', 'utf8');
const rows = parseCSV(csv);
const headers = rows[0];
const questions = rows.slice(1).map(row => {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i] || '');
  return obj;
});

// Output all questions in a review-friendly format
const output = [];
for (const q of questions) {
  output.push(`=== ID: ${q.id} | Type: ${q.test_type_id} | Level: ${q.cefr_level} ===`);
  output.push(`Q: ${q.question_text}`);
  if (q.option_a) output.push(`A: ${q.option_a}`);
  if (q.option_b) output.push(`B: ${q.option_b}`);
  if (q.option_c) output.push(`C: ${q.option_c}`);
  if (q.option_d) output.push(`D: ${q.option_d}`);
  output.push(`Answer: ${q.correct_answer}`);
  output.push(`Explanation: ${q.explanation}`);
  if (q.conversation && q.conversation !== 'NULL') {
    try {
      const conv = JSON.parse(q.conversation);
      output.push(`Conversation:`);
      conv.forEach(s => output.push(`  ${s.name} (${s.speaker}): ${s.text}`));
    } catch(e) {
      output.push(`Conversation RAW: ${q.conversation.substring(0, 200)}`);
    }
  }
  if (q.article && q.article !== 'NULL') {
    try {
      const art = JSON.parse(q.article);
      output.push(`Article: ${art.title}`);
      output.push(`Text: ${art.text}`);
      if (art.blanks) {
        art.blanks.forEach(b => output.push(`  Blank ${b.id}: ${b.correctAnswer}`));
      }
    } catch(e) {
      output.push(`Article RAW: ${q.article.substring(0, 200)}`);
    }
  }
  if (q.transcript && q.transcript !== 'NULL') {
    output.push(`Transcript: ${q.transcript.substring(0, 300)}`);
  }
  output.push('');
}

fs.writeFileSync('audit-output.txt', output.join('\n'), 'utf8');
console.log(`Total questions parsed: ${questions.length}`);
console.log('Written to audit-output.txt');