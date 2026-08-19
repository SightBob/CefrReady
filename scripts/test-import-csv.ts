import Papa from 'papaparse';

// Mirror of route.ts pre-processing — run the user's actual CSV through it
// to see whether validation passes or which error fires.

const TEST_TYPE_IDS = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'];

function hasHeaderLine(line: string): boolean {
  return line.trimStart().startsWith('testTypeId,');
}

function isDataRowStart(line: string): boolean {
  const trimmed = line.trimStart();
  return TEST_TYPE_IDS.some(t => trimmed.startsWith(t + ',') || trimmed.startsWith(t + '"'));
}

function normalizeCSV(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n');
  const result: string[] = [];
  let buffer = '';
  let inQuotes = false;

  for (const rawLine of lines) {
    const line = rawLine.trimStart();
    if (!line) continue;

    if (inQuotes) {
      buffer += '\n' + line;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
      }
      if (!inQuotes) {
        result.push(buffer);
        buffer = '';
      }
    } else {
      let tempInQuotes = false;
      for (const ch of line) {
        if (ch === '"') tempInQuotes = !tempInQuotes;
      }

      if (tempInQuotes) {
        buffer = line;
        inQuotes = true;
      } else if (isDataRowStart(line) || hasHeaderLine(line)) {
        if (buffer) { result.push(buffer); buffer = ''; }
        result.push(line);
      } else if (!line.includes(',') && line.length > 0) {
        if (result.length > 0) {
          result[result.length - 1] += ' ' + line;
        } else {
          buffer += (buffer ? ' ' : '') + line;
        }
      } else if (result.length > 0 && !isDataRowStart(line) && !hasHeaderLine(line)) {
        result[result.length - 1] += ' ' + line;
      } else if (buffer) {
        buffer += ' ' + line;
      } else {
        result.push(line);
      }
    }
  }
  if (buffer) result.push(buffer);
  return result.join('\n');
}

const CSV_COLUMNS = [
  'testTypeId','questionText','optionA','optionB','optionC','optionD',
  'correctAnswer','explanation','cefrLevel','difficulty','testSetId',
  'conversation','article','audioUrl','transcript',
] as const;

const csv = `testTypeId,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,cefrLevel,difficulty,testSetId,conversation,article,audioUrl,transcript
form-meaning,Read the article about Email 1 and fill in the blanks.,,,,,Fill in the blanks,,A2,easy,,,"{""text"":""We've arrived in Portugal and have moved {{1}} our new house at last! The house is quite big, {{2}} there's plenty of room for you to come and stay. It also has a nice garden and a swimming pool. But {{3}} best thing about the house is its beautiful views. {{4}} you're swimming in the pool, you can {{5}} the mountains of the Serra de Estrela in Portugal and the Sierra Franca in Spain. It's wonderful. The village is nice as well. It's small, but you can {{6}} what you need at the local shops. There {{7}} also some cafés and a restaurant. There's even a golf course and a lake next {{8}} the village."",""title"":""Email 1"",""blanks"":[{""id"":1,""correctAnswer"":""into""},{""id"":2,""correctAnswer"":""so""},{""id"":3,""correctAnswer"":""the""},{""id"":4,""correctAnswer"":""While""},{""id"":5,""correctAnswer"":""see""},{""id"":6,""correctAnswer"":""buy""},{""id"":7,""correctAnswer"":""are""},{""id"":8,""correctAnswer"":""to""}]}",,`;

const normalized = normalizeCSV(csv);
console.log('--- normalized lines ---');
normalized.split('\n').forEach((l, i) => console.log(`[${i}] ${l.slice(0, 80)}...`));

const result = Papa.parse<Record<string, string>>(normalized, { header: true, skipEmptyLines: true });

console.log('--- papa errors ---');
console.log(result.errors);

const row = result.data[0];
console.log('--- row fields ---');
for (const [k, v] of Object.entries(row)) {
  console.log(`${k} = ${JSON.stringify(v)?.slice(0, 70)}`);
}

if (row.article) {
  try {
    const art = JSON.parse(row.article);
    console.log('--- article JSON ---');
    console.log('title:', art.title);
    console.log('text length:', art.text?.length);
    console.log('blanks:', art.blanks?.length, JSON.stringify(art.blanks));
    console.log('VALIDATION: PASS');
  } catch (err) {
    console.log('ARTICLE JSON FAIL:', err instanceof Error ? err.message : err);
    console.log('article raw first 120:', row.article.slice(0, 120));
  }
}
