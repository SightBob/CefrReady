const fs = require('fs');

// Manual CSV parser
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
    if (ch === '\r' && content[i+1] === '\n') {
      row.push(current.trim()); current = ''; rows.push(row); row = []; i += 2; continue;
    }
    if (ch === '\n') {
      row.push(current.trim()); current = ''; rows.push(row); row = []; i++; continue;
    }
    current += ch; i++;
  }
  if (current || row.length > 0) { row.push(current.trim()); rows.push(row); }
  return rows;
}

const rows = parseCSV('questions (2).csv');
const headers = rows[0];
const questions = rows.slice(1).filter(r => r.length >= 8).map(row => {
  const q = {};
  headers.forEach((h, idx) => { q[h] = idx < row.length ? row[idx] : ''; });
  return q;
});

console.log(`Total questions: ${questions.length}\n`);

const issues = [];

for (const q of questions) {
  const id = parseInt(q.id);
  const qIssues = [];

  // 1. Check correct_answer matches one of the options
  const answer = q.correct_answer;
  const opts = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };

  if (!['A','B','C','D'].includes(answer)) {
    qIssues.push({ type: 'Logic Error', severity: 'high', desc: `correct_answer "${answer}" is not A/B/C/D` });
  } else if (!opts[answer] || opts[answer].trim() === '' || opts[answer].trim() === '—') {
    qIssues.push({ type: 'Logic Error', severity: 'high', desc: `correct_answer ${answer} points to empty/dash option: "${opts[answer]}"` });
  }

  // 2. Check for duplicate options
  const optVals = [q.option_a, q.option_b, q.option_c, q.option_d].map(o => (o||'').trim().toLowerCase());
  for (let i = 0; i < 4; i++) {
    for (let j = i+1; j < 4; j++) {
      if (optVals[i] && optVals[i] !== '—' && optVals[i] === optVals[j]) {
        qIssues.push({ type: 'Duplicate Options', severity: 'high', desc: `Option ${'ABCD'[i]} and ${'ABCD'[j]} are identical: "${optVals[i]}"` });
      }
    }
  }

  // 3. Check explanation supports the answer
  const expl = q.explanation || '';
  const correctOpt = opts[answer] || '';

  // Check if explanation mentions wrong option letter
  const wrongAnswers = ['A','B','C','D'].filter(a => a !== answer);
  for (const wa of wrongAnswers) {
    if (expl.includes(`ข้อ ${wa}`) || expl.includes(`ตัวเลือก ${wa}`)) {
      // Could be mentioning wrong answer to contrast, but flag for review
      qIssues.push({ type: 'คำอธิบายไม่สอดคล้อง', severity: 'medium', desc: `Explanation mentions wrong option ${wa} (correct is ${answer})` });
    }
  }

  // 4. For focus-meaning: check speaker mismatch in question vs conversation
  if (q.test_type_id === 'focus-meaning' && q.conversation) {
    try {
      const conv = JSON.parse(q.conversation);
      const qt = q.question_text || '';

      // Check if question asks about "the woman/girl/mother/sister/wife/daughter" but only male speakers
      const femaleTerms = ['woman','girl','mother','sister','wife','daughter','lady','ms','mrs'];
      const maleTerms = ['man','boy','father','brother','husband','son','mr'];

      const asksFemale = femaleTerms.some(t => qt.toLowerCase().includes(t));
      const asksMale = maleTerms.some(t => qt.toLowerCase().includes(t));

      const speakerNames = conv.map(c => (c.name||'').toLowerCase());
      const hasFemaleSpeaker = speakerNames.some(n => femaleTerms.some(t => n.includes(t)));
      const hasMaleSpeaker = speakerNames.some(n => maleTerms.some(t => n.includes(t)));

      if (asksFemale && !hasFemaleSpeaker) {
        qIssues.push({ type: 'Speaker Mismatch', severity: 'high', desc: `Question asks about female but no female speaker in conversation. Speakers: ${conv.map(c=>c.name).join(', ')}` });
      }
      if (asksMale && !hasMaleSpeaker) {
        qIssues.push({ type: 'Speaker Mismatch', severity: 'high', desc: `Question asks about male but no male speaker in conversation. Speakers: ${conv.map(c=>c.name).join(', ')}` });
      }

      // Check if all speakers have same name
      const uniqueNames = [...new Set(conv.map(c => c.name))];
      if (uniqueNames.length === 1 && conv.length > 1) {
        qIssues.push({ type: 'Speaker Mismatch', severity: 'medium', desc: `All speakers named "${uniqueNames[0]}" — should differentiate` });
      }

      // Check if answer paraphrases correct speaker
      // For "What does the X mean?" — the answer should describe X's statement
      const correctOptText = (opts[answer] || '').toLowerCase();

    } catch(e) {
      // Invalid JSON in conversation
    }
  }

  // 5. Check form-meaning article JSON
  if (q.test_type_id === 'form-meaning' && q.article) {
    try {
      const art = JSON.parse(q.article);
      const text = art.text || '';
      const blanks = art.blanks || [];

      // Check each blank appears in text
      for (const blank of blanks) {
        if (!text.includes(`{{${blank.id}}}`)) {
          qIssues.push({ type: 'Logic Error', severity: 'high', desc: `Blank ${blank.id} not found in article text` });
        }
      }

      // Check for text without blanks (missing {{N}})
      const blankIds = blanks.map(b => b.id);
      const textBlankRefs = [...text.matchAll(/\{\{(\d+)\}\}/g)].map(m => parseInt(m[1]));
      for (const ref of textBlankRefs) {
        if (!blankIds.includes(ref)) {
          qIssues.push({ type: 'Logic Error', severity: 'high', desc: `Text references {{${ref}}} but no blank defined` });
        }
      }

      // Check if article text seems grammatically wrong by filling in blanks
      let filledText = text;
      for (const blank of blanks) {
        filledText = filledText.replace(`{{${blank.id}}}`, blank.correctAnswer);
      }
      // Remove double spaces
      filledText = filledText.replace(/\s+/g, ' ');

      // Check for obvious grammar issues after filling
      if (filledText.match(/\b[aA]\s+[aeiou]/i) && !filledText.match(/\ban\s+/i)) {
        // Might need "an" instead of "a" — soft check
      }

    } catch(e) {
      qIssues.push({ type: 'Logic Error', severity: 'high', desc: `Invalid article JSON: ${e.message.substring(0,80)}` });
    }
  }

  // 6. Check for empty required fields
  if (!q.question_text || q.question_text.trim() === '') {
    qIssues.push({ type: 'Logic Error', severity: 'high', desc: 'Empty question_text' });
  }
  if (!expl || expl.trim() === '') {
    qIssues.push({ type: 'คำอธิบายไม่สอดคล้อง', severity: 'medium', desc: 'Empty explanation' });
  }

  // 7. Check explanation relevance - does it mention the correct answer content?
  if (expl && correctOpt) {
    const explLower = expl.toLowerCase();
    const answerText = correctOpt.trim().toLowerCase();
    // Very basic check: if explanation mentions the answer keyword
    // This is a soft check - many explanations explain the grammar rule rather than quoting the answer
  }

  // 8. Check for copy-paste explanation errors
  // If explanation seems to describe a different grammar point than what the question tests
  if (q.test_type_id === 'focus-form' && expl) {
    const qt = q.question_text || '';
    // Check if explanation mentions the answer word vs a completely different word
    const answerWord = correctOpt.trim().toLowerCase();

    // Grammar pattern checks
    if (qt.includes('___') && expl) {
      // The blank should be related to what the explanation says
    }
  }

  if (qIssues.length > 0) {
    issues.push({ id, q, issues: qIssues });
  }
}

// Also check for duplicate question_text
const textMap = {};
for (const q of questions) {
  const key = (q.question_text || '').trim().toLowerCase();
  if (key) {
    if (!textMap[key]) textMap[key] = [];
    textMap[key].push(q.id);
  }
}
for (const [text, ids] of Object.entries(textMap)) {
  if (ids.length > 1) {
    issues.push({
      id: parseInt(ids[0]),
      q: questions.find(q => q.id === ids[0]),
      issues: [{ type: 'Duplicate Question', severity: 'high', desc: `Duplicate question_text (IDs: ${ids.join(', ')}): "${text.substring(0,80)}..."` }]
    });
  }
}

// Also check for duplicate conversations
const convMap = {};
for (const q of questions) {
  if (q.conversation && q.conversation.length > 10) {
    // Normalize conversation for comparison
    try {
      const conv = JSON.parse(q.conversation);
      const key = conv.map(c => c.text.trim()).join('|||').toLowerCase();
      if (!convMap[key]) convMap[key] = [];
      convMap[key].push(q.id);
    } catch(e) {}
  }
}
for (const [key, ids] of Object.entries(convMap)) {
  if (ids.length > 1) {
    // Only flag if not already caught by duplicate question_text
    const existing = issues.find(i => i.id === parseInt(ids[0]) && i.issues.some(iss => iss.type === 'Duplicate Question'));
    if (!existing) {
      issues.push({
        id: parseInt(ids[0]),
        q: questions.find(q => q.id === ids[0]),
        issues: [{ type: 'Duplicate Conversation', severity: 'high', desc: `Same conversation used in IDs: ${ids.join(', ')}` }]
      });
    }
  }
}

// Print results
console.log(`\n========================================`);
console.log(`AUTOMATED CHECK RESULTS`);
console.log(`========================================`);
console.log(`Questions checked: ${questions.length}`);
console.log(`Questions with issues: ${issues.length}`);

const highIssues = issues.flatMap(i => i.issues.filter(iss => iss.severity === 'high'));
const medIssues = issues.flatMap(i => i.issues.filter(iss => iss.severity === 'medium'));
const lowIssues = issues.flatMap(i => i.issues.filter(iss => iss.severity === 'low'));

console.log(`High severity: ${highIssues.length}`);
console.log(`Medium severity: ${medIssues.length}`);
console.log(`Low severity: ${lowIssues.length}`);

console.log(`\n========================================`);
console.log(`DETAILED ISSUES`);
console.log(`========================================\n`);

// Sort by severity then ID
const severityOrder = { high: 0, medium: 1, low: 2 };
const sortedIssues = [...issues].sort((a, b) => {
  const aSev = Math.min(...a.issues.map(i => severityOrder[i.severity]));
  const bSev = Math.min(...b.issues.map(i => severityOrder[i.severity]));
  if (aSev !== bSev) return aSev - bSev;
  return a.id - b.id;
});

for (const item of sortedIssues) {
  console.log(`\nข้อที่: ${item.id}`);
  console.log(`Question: ${(item.q.question_text||'').substring(0,120)}`);
  console.log(`Answer: ${item.q.correct_answer} = ${(item.q['option_' + item.q.correct_answer.toLowerCase()]||'').substring(0,80)}`);
  console.log(`Explanation: ${(item.q.explanation||'').substring(0,150)}`);
  for (const iss of item.issues) {
    console.log(`  ❌ [${iss.severity.toUpperCase()}] ${iss.type}: ${iss.desc}`);
  }
}