import { db } from '../src/db';
import { testTypes, questions } from '../src/db/schema';

async function seedAdminData() {
  console.log('🌱 Starting admin data seeding...');

  try {
    console.log('📝 Creating test types...');
    const testTypeData = [
      {
        slug: 'focus-form',
        title: 'Focus on Form',
        description: 'Test your knowledge of grammatical structures, verb forms, and sentence patterns.',
        duration: '15 min',
        icon: 'PenTool',
        colorScheme: 'blue-cyan',
        isActive: true,
      },
      {
        slug: 'focus-meaning',
        title: 'Focus on Meaning',
        description: 'Understand vocabulary meanings, synonyms, and contextual usage.',
        duration: '20 min',
        icon: 'BookOpen',
        colorScheme: 'emerald-teal',
        isActive: true,
      },
      {
        slug: 'form-meaning',
        title: 'Form & Meaning',
        description: 'Combined assessment of both grammatical accuracy and semantic understanding.',
        duration: '25 min',
        icon: 'Layers',
        colorScheme: 'purple-pink',
        isActive: true,
      },
      {
        slug: 'listening',
        title: 'Listening',
        description: 'Comprehend spoken English through audio passages and conversations.',
        duration: '30 min',
        icon: 'Headphones',
        colorScheme: 'orange-amber',
        isActive: true,
      },
    ];

    const createdTestTypes = await db.insert(testTypes).values(testTypeData).returning();
    console.log(`✅ Created ${createdTestTypes.length} test types`);

    console.log('📚 Creating sample questions...');
    const focusFormType = createdTestTypes.find(t => t.slug === 'focus-form');
    const focusMeaningType = createdTestTypes.find(t => t.slug === 'focus-meaning');

    if (focusFormType) {
      const focusFormQuestions = [
        {
          testTypeId: focusFormType.id,
          sentence: 'She ___ to the store yesterday.',
          options: ['go', 'goes', 'went', 'going'],
          correctAnswer: 2,
          explanation: '"Yesterday" indicates past tense, so "went" is correct.',
          difficulty: 'easy',
          cefrLevel: 'A2',
          isActive: true,
          orderIndex: 1,
        },
        {
          testTypeId: focusFormType.id,
          sentence: 'They have ___ working all day.',
          options: ['is', 'are', 'been', 'being'],
          correctAnswer: 2,
          explanation: 'Present perfect continuous uses "have been" + -ing form.',
          difficulty: 'medium',
          cefrLevel: 'B1',
          isActive: true,
          orderIndex: 2,
        },
        {
          testTypeId: focusFormType.id,
          sentence: 'If I ___ rich, I would travel the world.',
          options: ['am', 'was', 'were', 'be'],
          correctAnswer: 2,
          explanation: 'Second conditional uses "were" for all subjects in the if-clause.',
          difficulty: 'medium',
          cefrLevel: 'B1',
          isActive: true,
          orderIndex: 3,
        },
        {
          testTypeId: focusFormType.id,
          sentence: 'The book ___ by millions of people.',
          options: ['has read', 'has been read', 'have been read', 'is reading'],
          correctAnswer: 1,
          explanation: 'Passive voice in present perfect: has/have been + past participle.',
          difficulty: 'hard',
          cefrLevel: 'B2',
          isActive: true,
          orderIndex: 4,
        },
        {
          testTypeId: focusFormType.id,
          sentence: 'She made him ___ the truth.',
          options: ['tell', 'to tell', 'telling', 'told'],
          correctAnswer: 0,
          explanation: 'Make + object + base form of verb (without "to").',
          difficulty: 'medium',
          cefrLevel: 'B1',
          isActive: true,
          orderIndex: 5,
        },
      ];

      await db.insert(questions).values(focusFormQuestions);
      console.log(`✅ Created ${focusFormQuestions.length} Focus on Form questions`);
    }

    if (focusMeaningType) {
      const focusMeaningQuestions = [
        {
          testTypeId: focusMeaningType.id,
          sentence: 'The word "abundant" is closest in meaning to ___.',
          options: ['scarce', 'plentiful', 'limited', 'rare'],
          correctAnswer: 1,
          explanation: '"Abundant" means existing in large quantities, which is synonymous with "plentiful".',
          difficulty: 'easy',
          cefrLevel: 'B1',
          isActive: true,
          orderIndex: 1,
        },
        {
          testTypeId: focusMeaningType.id,
          sentence: 'To "procrastinate" means to ___.',
          options: ['work quickly', 'delay doing something', 'finish early', 'plan ahead'],
          correctAnswer: 1,
          explanation: '"Procrastinate" means to delay or postpone action.',
          difficulty: 'medium',
          cefrLevel: 'B2',
          isActive: true,
          orderIndex: 2,
        },
        {
          testTypeId: focusMeaningType.id,
          sentence: 'The opposite of "optimistic" is ___.',
          options: ['hopeful', 'positive', 'pessimistic', 'cheerful'],
          correctAnswer: 2,
          explanation: '"Pessimistic" is the antonym of "optimistic".',
          difficulty: 'easy',
          cefrLevel: 'A2',
          isActive: true,
          orderIndex: 3,
        },
        {
          testTypeId: focusMeaningType.id,
          sentence: 'A "meticulous" person is ___.',
          options: ['careless', 'very careful about details', 'lazy', 'disorganized'],
          correctAnswer: 1,
          explanation: '"Meticulous" describes someone who pays great attention to detail.',
          difficulty: 'hard',
          cefrLevel: 'C1',
          isActive: true,
          orderIndex: 4,
        },
        {
          testTypeId: focusMeaningType.id,
          sentence: 'To "enhance" something means to ___.',
          options: ['reduce it', 'improve it', 'destroy it', 'ignore it'],
          correctAnswer: 1,
          explanation: '"Enhance" means to improve or increase the quality, value, or extent of something.',
          difficulty: 'medium',
          cefrLevel: 'B2',
          isActive: true,
          orderIndex: 5,
        },
      ];

      await db.insert(questions).values(focusMeaningQuestions);
      console.log(`✅ Created ${focusMeaningQuestions.length} Focus on Meaning questions`);
    }

    console.log('✨ Admin data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding admin data:', error);
    throw error;
  }
}

seedAdminData()
  .then(() => {
    console.log('🎉 Seeding finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
