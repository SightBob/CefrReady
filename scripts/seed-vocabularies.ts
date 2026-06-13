import { db } from '@/db';
import { vocabularies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { vocabularyContent } from '@/content/must-know/vocabulary';

async function seedVocabularies() {
  console.log('Seeding vocabularies from static file...');

  for (const item of vocabularyContent) {
    const existing = await db
      .select()
      .from(vocabularies)
      .where(eq(vocabularies.word, item.word))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  SKIP: "${item.word}" already exists`);
      continue;
    }

    await db.insert(vocabularies).values({
      word: item.word,
      phonetic: item.phonetic || null,
      partOfSpeech: item.partOfSpeech || null,
      definition: item.definition,
      example: item.example || null,
      thaiMeaning: item.thaiMeaning,
      cefrLevel: item.cefrLevel,
      topic: item.topic || null,
      isPublished: true,
    });

    console.log(`  INSERT: "${item.word}" (${item.cefrLevel})`);
  }

  console.log(`Done. Seeded ${vocabularyContent.length} vocabulary items.`);
  process.exit(0);
}

seedVocabularies().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
