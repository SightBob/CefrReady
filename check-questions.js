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

const issues = [];
const questions = [];

for (const row of data) {
  const q = {};
  headers.forEach((h, idx) => { q[h] = idx < row.length ? row[idx] : ''; });
  questions.push(q);
}

// Sort by ID
questions.sort((a, b) => parseInt(a.id) - parseInt(b.id));

const totalQuestions = questions.length;
console.log(`Total questions: ${totalQuestions}`);
console.log('---');

// ============================
// CHECK 1: Answer validity
// ============================
for (const q of questions) {
  const ans = q.correct_answer;
  if (!ans) {
    issues.push({ id: q.id, severity: 'HIGH', type: 'เฉลยผิด', detail: 'ไม่มีเฉลย (correct_answer ว่าง)' });
    continue;
  }

  const opts = {
    A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d
  };

  // Check if correct_answer letter maps to a non-empty option
  const ansLetter = ans.charAt(0).toUpperCase();
  if (['A','B','C','D'].includes(ansLetter)) {
    const optText = opts[ansLetter];
    if (!optText || optText.trim() === '' || optText.trim() === '—' || optText.trim() === '-') {
      issues.push({ id: q.id, severity: 'HIGH', type: 'เฉลยผิด', detail: `เฉลยคือ ${ansLetter} แต่ตัวเลือก ${ansLetter} ว่างหรือเป็นขีด "-" ว่าง` });
    }
  }
}

// ============================
// CHECK 2: Focus-form - answer should appear in question text
// ============================
for (const q of questions) {
  if (q.test_type_id !== 'focus-form') continue;
  const ans = (q.correct_answer || '').trim().toLowerCase();
  const qText = (q.question_text || '').toLowerCase();

  if (ans && ans.length > 1 && !qText.includes('___') && !qText.includes('____')) {
    issues.push({ id: q.id, severity: 'MEDIUM', type: 'โจทย์กำกวม', detail: `Focus-form แต่ไม่มีช่องว่าง ___ ในโจทย์: "${q.question_text.substring(0,80)}"` });
  }
}

// ============================
// CHECK 3: Focus-meaning speaker mismatch
// ============================
for (const q of questions) {
  if (q.test_type_id !== 'focus-meaning') continue;
  if (!q.conversation || q.conversation.trim() === '') continue;

  let conv;
  try { conv = JSON.parse(q.conversation); } catch(e) { continue; }

  const qText = q.question_text || '';
  const opts = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
  const ans = q.correct_answer || '';

  // Check speaker names: all same?
  if (conv.length >= 2) {
    const names = conv.map(s => s.name);
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length === 1) {
      issues.push({ id: q.id, severity: 'MEDIUM', type: 'Speaker Mismatch', detail: `ทุก speaker ชื่อ "${uniqueNames[0]}" — น่าจะมีหลายคน` });
    }
  }

  // Check: question asks "the man/woman/girl/boy" but speaker names don't match
  const qLower = qText.toLowerCase();
  const asksMan = /\b(man|boy|husband|father|he)\b/i.test(qText);
  const asksWoman = /\b(woman|girl|wife|mother|she)\b/i.test(qText);

  // Get speaker names by gender
  const maleNames = ['Man','Boy','Husband','Father','Son','Brother'];
  const femaleNames = ['Woman','Girl','Wife','Mother','Daughter','Sister'];
  const speakerNames = conv.map(s => s.name);

  if (asksMan) {
    const hasMale = speakerNames.some(n => maleNames.includes(n));
    if (!hasMale && speakerNames.some(n => femaleNames.includes(n))) {
      issues.push({ id: q.id, severity: 'HIGH', type: 'Speaker Mismatch', detail: `โจทย์ถาม "the man" แต่ speakers คือ ${speakerNames.join(', ')} ไม่มีผู้ชาย` });
    }
  }
  if (asksWoman) {
    const hasFemale = speakerNames.some(n => femaleNames.includes(n));
    if (!hasFemale && speakerNames.some(n => maleNames.includes(n))) {
      issues.push({ id: q.id, severity: 'HIGH', type: 'Speaker Mismatch', detail: `โจทย์ถาม "the woman" แต่ speakers คือ ${speakerNames.join(', ')} ไม่มีผู้หญิง` });
    }
  }
}

// ============================
// CHECK 4: Explanation-answer mismatch (basic check)
// ============================
for (const q of questions) {
  const expl = (q.explanation || '').trim();
  if (!expl || expl.length < 10) continue;

  // Check if explanation mentions an option letter that differs from correct_answer
  const ans = q.correct_answer || '';
  if (['A','B','C','D'].includes(ans)) {
    const opts = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    const correctOpt = opts[ans] || '';
    const otherOpts = ['A','B','C','D'].filter(x => x !== ans).map(x => opts[x]).filter(Boolean);

    // If explanation contains text from another option but NOT from correct option
    // This is a weak signal, only flag for strong matches
  }
}

// ============================
// CHECK 5: Duplicate detection (same question_text)
// ============================
const seenTexts = {};
for (const q of questions) {
  const t = (q.question_text || '').trim();
  if (!t) continue;
  if (seenTexts[t]) {
    issues.push({ id: q.id, severity: 'HIGH', type: 'คำถามซ้ำ', detail: `โจทย์เหมือนกับ ID ${seenTexts[t]} เป๊ะ` });
  } else {
    seenTexts[t] = q.id;
  }
}

// ============================
// CHECK 6: Options - check for duplicate meanings or empty options
// ============================
for (const q of questions) {
  const opts = [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o && o.trim() && o.trim() !== '—' && o.trim() !== '-');
  if (q.test_type_id === 'focus-form') continue; // focus-form often has fewer options
  if (opts.length < 3 && q.test_type_id !== 'form-meaning') {
    issues.push({ id: q.id, severity: 'MEDIUM', type: 'ตัวเลือกไม่เพียงพอ', detail: `มีตัวเลือกใช้ได้เพียง ${opts.length} ตัวเลือก` });
  }
}

// ============================
// CHECK 7: Listening - transcript check
// ============================
for (const q of questions) {
  if (q.test_type_id !== 'listening') continue;
  if (!q.transcript || q.transcript.trim() === '') {
    issues.push({ id: q.id, severity: 'HIGH', type: 'ข้อมูลไม่ครบ', detail: 'Listening แต่ไม่มี transcript' });
  }
}

// ============================
// CHECK 8: Form-meaning article JSON validity
// ============================
for (const q of questions) {
  if (q.test_type_id !== 'form-meaning') continue;
  if (!q.article || q.article.trim() === '') {
    issues.push({ id: q.id, severity: 'HIGH', type: 'ข้อมูลไม่ครบ', detail: 'Form-meaning แต่ไม่มี article JSON' });
    continue;
  }
  try {
    const art = JSON.parse(q.article);
    if (!art.text || !art.blanks || !Array.isArray(art.blanks)) {
      issues.push({ id: q.id, severity: 'HIGH', type: 'ข้อมูลไม่ครบ', detail: 'Article JSON ไม่มี text หรือ blanks array' });
    }
  } catch(e) {
    issues.push({ id: q.id, severity: 'HIGH', type: 'ข้อมูลไม่ครบ', detail: `Article JSON ผิดรูปแบบ: ${e.message.substring(0,50)}` });
  }
}

// ============================
// CHECK 9: Conversation JSON validity
// ============================
for (const q of questions) {
  if (!q.conversation || q.conversation.trim() === '' || q.conversation.trim() === '{}') continue;
  try {
    const conv = JSON.parse(q.conversation);
    if (!Array.isArray(conv) || conv.length < 2) {
      issues.push({ id: q.id, severity: 'MEDIUM', type: 'ข้อมูลไม่ครบ', detail: 'Conversation ควรมีอย่างน้อย 2 speakers' });
    }
    // Check speaker labels are only A or B
    for (const s of conv) {
      if (!['A','B'].includes(s.speaker)) {
        issues.push({ id: q.id, severity: 'MEDIUM', type: 'Speaker Mismatch', detail: `Speaker label ไม่ใช่ A/B: "${s.speaker}"` });
        break;
      }
    }
  } catch(e) {
    issues.push({ id: q.id, severity: 'HIGH', type: 'ข้อมูลไม่ครบ', detail: `Conversation JSON ผิดรูปแบบ: ${e.message.substring(0,50)}` });
  }
}

// ============================
// OUTPUT REPORT
// ============================
const highIssues = issues.filter(i => i.severity === 'HIGH');
const medIssues = issues.filter(i => i.severity === 'MEDIUM');
const lowIssues = issues.filter(i => i.severity === 'LOW');

console.log('\n========== ISSUES FOUND ==========');
console.log(`Total issues: ${issues.length}`);
console.log(`  HIGH: ${highIssues.length}`);
console.log(`  MEDIUM: ${medIssues.length}`);
console.log(`  LOW: ${lowIssues.length}`);
console.log('');

for (const issue of issues) {
  console.log(`ID:${issue.id} | ${issue.severity} | ${issue.type}`);
  console.log(`  ${issue.detail}`);
  console.log('');
}

// ============================
// OUTPUT ALL QUESTIONS FOR DETAILED REVIEW
// ============================
console.log('\n========== ALL QUESTIONS FOR REVIEW ==========');
for (const q of questions) {
  const ans = q.correct_answer || '';
  const opts = {};
  if (q.option_a && q.option_a.trim() !== '—') opts.A = q.option_a;
  if (q.option_b && q.option_b.trim() !== '—') opts.B = q.option_b;
  if (q.option_c && q.option_c.trim() !== '—') opts.C = q.option_c;
  if (q.option_d && q.option_d.trim() !== '—') opts.D = q.option_d;

  console.log(`\n--- ID:${q.id} [${q.test_type_id}] [${q.cefr_level}/${q.difficulty}] ---`);
  console.log(`Q: ${q.question_text}`);
  for (const [letter, text] of Object.entries(opts)) {
    console.log(`${letter}: ${text}`);
  }
  console.log(`ANSWER: ${ans}`);

  if (q.explanation) console.log(`EXPL: ${q.explanation.substring(0, 300)}`);
  if (q.conversation && q.conversation.trim() !== '' && q.conversation.trim() !== '{}') {
    console.log(`CONV: ${q.conversation.substring(0, 500)}`);
  }
  if (q.transcript && q.transcript.trim() !== '') {
    console.log(`TRAN: ${q.transcript.substring(0, 300)}`);
  }
  if (q.article && q.article.trim() !== '') {
    console.log(`ART: ${q.article.substring(0, 500)}`);
  }
}
