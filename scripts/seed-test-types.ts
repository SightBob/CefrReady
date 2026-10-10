import 'dotenv/config';
import { db } from '../src/db';
import { testTypes } from '../src/db/schema';

/**
 * Inserts the four built-in test types if they are missing.
 * Idempotent: existing rows (matched by id) are left unchanged.
 * Does not touch questions, test sets, or users.
 */
const TEST_TYPES = [
  {
    id: 'focus-form',
    name: 'Focus on Form',
    description: 'ไวยากรณ์ภาษาอังกฤษ (Grammar)',
    color: 'blue-cyan',
  },
  {
    id: 'focus-meaning',
    name: 'Focus on Meaning',
    description: 'คำศัพท์และความหมาย (Vocabulary)',
    color: 'emerald-teal',
  },
  {
    id: 'form-meaning',
    name: 'Form & Meaning',
    description: 'เติมคำในบทความ (Cloze test)',
    color: 'purple-pink',
  },
  {
    id: 'listening',
    name: 'Listening',
    description: 'ฟังและตอบคำถาม',
    color: 'orange-amber',
  },
] as const;

async function seedTestTypes() {
  console.log('Seeding test types...');
  await db.insert(testTypes).values([...TEST_TYPES]).onConflictDoNothing({ target: testTypes.id });
  console.log(`Done: ensured ${TEST_TYPES.length} test types exist.`);
}

seedTestTypes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
