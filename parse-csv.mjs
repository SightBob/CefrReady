import fs from 'fs';

const raw = fs.readFileSync('questions (2).csv', 'utf-8');

// Robust CSV parser handling quoted fields with commas and newlines
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function parseField() {
    if (i >= len) return '';
    if (text[i] === '"') {
      i++; // skip opening quote
      let field = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += text[i];
          i++;
        }
      }
      return field;
    } else {
      let field = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        field += text[i];
        i++;
      }
      return field;
    }
  }

  function parseRow() {
    const fields = [];
    fields.push(parseField());
    while (i < len && text[i] === ',') {
      i++; // skip comma
      fields.push(parseField());
    }
    // skip newline
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    return fields;
  }

  while (i < len) {
    const row = parseRow();
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
  }
  return rows;
}

const rows = parseCSV(raw);
const headers = rows[0];
const questions = [];

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const obj = {};
  for (let c = 0; c < headers.length; c++) {
    obj[headers[c]] = row[c] || '';
  }
  questions.push(obj);
}

// Output as JSON
fs.writeFileSync('parsed-questions.json', JSON.stringify(questions, null, 2));
console.log(`Parsed ${questions.length} questions`);

// Also output a quick summary
const types = {};
questions.forEach(q => {
  const tt = q.test_type_id || 'unknown';
  types[tt] = (types[tt] || 0) + 1;
});
console.log('By test_type_id:', types);

const levels = {};
questions.forEach(q => {
  const lv = q.cefr_level || 'unknown';
  levels[lv] = (levels[lv] || 0) + 1;
});
console.log('By CEFR level:', levels);