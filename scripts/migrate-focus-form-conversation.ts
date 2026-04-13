/**
 * One-time migration script:
 * Parses questionText for focus-form questions and populates the `conversation` jsonb column.
 *
 * Usage: npx tsx scripts/migrate-focus-form-conversation.ts
 */

import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

interface ConversationLine {
  speaker: string;
  text: string;
}

function parseDialogue(text: string): ConversationLine[] | null {
  const lines = text.split(/(?<=[.?!])\s+(?=[A-Z][a-zA-Z]*:)/);
  if (lines.length <= 1 && !lines[0]?.includes(':')) return null;

  const result: ConversationLine[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return null; // can't parse — skip this question
    const speaker = line.slice(0, colonIdx).trim();
    const dialogueText = line.slice(colonIdx + 1).trim();
    if (!speaker || !dialogueText) return null;
    result.push({ speaker, text: dialogueText });
  }
  return result.length > 0 ? result : null;
}

async function main() {
  console.log('Fetching focus-form questions without conversation data...');

  const rows = await db
    .select({ id: questions.id, questionText: questions.questionText })
    .from(questions)
    .where(eq(questions.testTypeId, 'focus-form'));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = await db
      .select({ conversation: questions.conversation })
      .from(questions)
      .where(eq(questions.id, row.id))
      .then((r) => r[0]);

    if (existing?.conversation) {
      skipped++;
      continue;
    }

    const parsed = parseDialogue(row.questionText);
    if (!parsed) {
      skipped++;
      continue;
    }

    await db
      .update(questions)
      .set({ conversation: parsed })
      .where(eq(questions.id, row.id));

    updated++;
    console.log(`  ✓ Q${row.id}: ${parsed.length} lines`);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch(console.error);
