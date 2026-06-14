import { db } from '../src/db';
import { testTypes } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  const existing = await db.select().from(testTypes).where(eq(testTypes.id, 'full-test'));
  if (existing.length === 0) {
    await db.insert(testTypes).values({
      id: 'full-test',
      name: 'Full Mock Exam',
      description: '45-question adaptive full exam combining all sections',
      icon: 'trophy',
      color: 'primary',
      duration: 60,
      questionCount: 45,
      active: 'true',
    });
    console.log('Seeded full-test test type');
  } else {
    console.log('full-test test type already exists');
  }
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
