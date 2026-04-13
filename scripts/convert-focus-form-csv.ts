/**
 * Converts focus-on-form-ready.csv to add a `conversation` column.
 * Takes only the first 11 columns (original schema) and appends parsed conversation.
 *
 * Usage: npx tsx scripts/convert-focus-form-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ConversationLine {
  speaker: string;
  text: string;
}

function parseDialogue(text: string): ConversationLine[] | null {
  const lines = text.split(/(?<=[.?!])\s*(?=[A-Z][a-zA-Z]*:)/);
  if (lines.length <= 1 && !lines[0]?.includes(':')) return null;

  const result: ConversationLine[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return null;
    const speaker = line.slice(0, colonIdx).trim();
    const dialogueText = line.slice(colonIdx + 1).trim();
    if (!speaker || !dialogueText) return null;
    result.push({ speaker, text: dialogueText });
  }
  return result.length > 0 ? result : null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// Column indices in the original 11-column schema
const Q_TEXT_IDX = 1;
const ORIG_COL_COUNT = 11; // testTypeId .. testSetId

function main() {
  const csvPath = path.join(__dirname, '..', 'csv_data', 'focus-on-form-ready.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const rows = raw.split('\n').filter((r) => r.trim());

  const headerFields = parseCSVLine(rows[0]);
  // Always take only original columns
  const origHeader = headerFields.slice(0, ORIG_COL_COUNT);
  const newHeader = [...origHeader, 'conversation'];

  const outputRows: string[] = [newHeader.map((h) => `"${h}"`).join(',')];

  let parsed = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const fields = parseCSVLine(rows[i]);
    if (fields.length < Q_TEXT_IDX + 1) continue;

    const questionText = fields[Q_TEXT_IDX];
    const conversation = parseDialogue(questionText);

    const row = fields.slice(0, ORIG_COL_COUNT);
    if (conversation) {
      const json = JSON.stringify(conversation).replace(/"/g, '""');
      row.push(`"${json}"`);
      parsed++;
    } else {
      row.push('');
      skipped++;
    }

    outputRows.push(row.map((f) => `"${f}"`).join(','));
  }

  fs.writeFileSync(csvPath, outputRows.join('\n') + '\n', 'utf-8');
  console.log(`Done. Parsed: ${parsed}, Skipped (no dialogue): ${skipped}`);
}

main();
