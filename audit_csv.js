// Parse CSV with proper quoted field handling
const fs = require('fs');

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

const csvText = fs.readFileSync('questions (2).csv', 'utf8').replace(/^﻿/, '');
const rows = parseCSV(csvText);

const headers = rows[0];
const questions = rows.slice(1).map(row => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx] || '';
  });
  return obj;
});

// Output as JSON for review
const output = questions.map(q => ({
  id: parseInt(q.id),
  test_type_id: parseInt(q.test_type_id),
  question_text: q.question_text,
  option_a: q.option_a,
  option_b: q.option_b,
  option_c: q.option_c,
  option_d: q.option_d,
  correct_answer: q.correct_answer,
  explanation: q.explanation,
  conversation: q.conversation,
  audio_url: q.audio_url,
  transcript: q.transcript,
  article: q.article,
  cefr_level: q.cefr_level,
  difficulty: q.difficulty,
  active: q.active,
  order_index: q.order_index
}));

console.log(JSON.stringify({ count: output.length, questions: output }, null, 2));