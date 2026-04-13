const fs = require('fs');

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (j + 1 < line.length && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.replace(/^"|"$/g, '').trim() || '';
    });
    rows.push(row);
  }
  return rows;
}

function escapeCSV(str) {
  if (typeof str !== 'string') return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const csvData = fs.readFileSync('csv_data/ข้อสอบ ล่าสุด cefr - ชีต4.csv', 'utf8');
const rows = parseCSV(csvData);

// Group by passage_title
const passages = {};

rows.forEach(row => {
  const title = row.passage_title;
  if (!passages[title]) {
    passages[title] = {
      title,
      questions: []
    };
  }
  passages[title].questions.push(row);
});

const outputRows = [];
// Headers matched to the import format
const outputHeaders = [
  'testTypeId', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD',
  'correctAnswer', 'explanation', 'cefrLevel', 'difficulty', 'testSetId', 'article'
];

outputRows.push(outputHeaders.join(','));

let fakeOptionA = '-';
let fakeOptionB = '-';
let fakeOptionC = '-';
let fakeOptionD = '-';

let startSetId = 24; // You can adjust this based on the existing max testSetId

Object.values(passages).forEach((passage) => {
  // Build the text
  // The user's rows each have a `question` which is a sentence. So we join them with spaces.
  let fullText = passage.questions.map(q => {
    return q.question.replace('___', `{{${q.blank_id}}}`);
  }).join(' ');

  const blanks = passage.questions.map(q => ({
    id: parseInt(q.blank_id),
    correctAnswer: q.answer,
    hint: q.explanation // We can put explanation as hint
  }));

  const articleObj = {
    title: passage.title,
    text: fullText,
    blanks: blanks
  };

  const articleJsonString = JSON.stringify(articleObj);

  // We make ONE row for this article
  const outRow = [
    'form-meaning',
    passage.title,  // questionText just use title
    fakeOptionA,
    fakeOptionB,
    fakeOptionC,
    fakeOptionD,
    'A', // correctAnswer
    '', // explanation
    'B1', // Default cefrLevel
    'medium',
    '', // testSetId
    articleJsonString
  ];

  outputRows.push(outRow.map(escapeCSV).join(','));
});

fs.writeFileSync('csv_data/formatted-form-meaning.csv', outputRows.join('\n'), 'utf8');
console.log('Successfully generated csv_data/formatted-form-meaning.csv with ' + Object.keys(passages).length + ' articles.');
