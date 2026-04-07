import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function seedAdminData() {
  console.log('🌱 Starting admin data seeding...');

  try {
    // First, drop existing tables to recreate with new schema
    console.log('🔄 Dropping existing tables...');
    await db.execute(sql`DROP TABLE IF EXISTS questions CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS test_types CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS user_progress CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS test_attempts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS sessions CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS accounts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS verification_tokens CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);

    // Create NextAuth tables
    console.log('📝 Creating NextAuth tables...');
    await db.execute(sql`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        email_verified TIMESTAMP,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE accounts (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        PRIMARY KEY (provider, provider_account_id)
      )
    `);

    await db.execute(sql`
      CREATE TABLE sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMP NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `);

    // Recreate test_types with new schema
    console.log('📝 Creating test_types table...');
    await db.execute(sql`
      CREATE TABLE test_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(50),
        duration INTEGER,
        question_count INTEGER,
        active VARCHAR(5) DEFAULT 'true' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create questions table
    console.log('📝 Creating questions table...');
    await db.execute(sql`
      CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        test_type_id VARCHAR(50) NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer VARCHAR(1) NOT NULL,
        explanation TEXT,
        cefr_level VARCHAR(10) NOT NULL,
        difficulty VARCHAR(20),
        active VARCHAR(5) DEFAULT 'true' NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create user_progress table
    console.log('📝 Creating user_progress table...');
    await db.execute(sql`
      CREATE TABLE user_progress (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_type_id VARCHAR(50) NOT NULL,
        average_score VARCHAR(10),
        tests_taken INTEGER DEFAULT 0,
        last_attempt_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (user_id, test_type_id)
      )
    `);

    // Create test_attempts table
    console.log('📝 Creating test_attempts table...');
    await db.execute(sql`
      CREATE TABLE test_attempts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_type_id VARCHAR(50) NOT NULL,
        score VARCHAR(10),
        total_questions INTEGER,
        correct_answers INTEGER,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('📝 Creating test types...');
    const createdTestTypes = await db.execute(sql`
      INSERT INTO test_types (name, description, duration, active)
      VALUES
        ('focus-form', 'Test your knowledge of grammatical structures, verb forms, and sentence patterns.', 15, 'true'),
        ('focus-meaning', 'Understand vocabulary meanings, synonyms, and contextual usage.', 20, 'true'),
        ('form-meaning', 'Combined assessment of both grammatical accuracy and semantic understanding.', 25, 'true'),
        ('listening', 'Comprehend spoken English through audio passages and conversations.', 30, 'true')
      RETURNING *
    `);

    const testTypeList = createdTestTypes.rows;
    console.log(`✅ Created ${testTypeList.length} test types`);

    console.log('📚 Creating sample questions...');
    const focusFormType = testTypeList.find((t: any) => t.name === 'focus-form');
    const focusMeaningType = testTypeList.find((t: any) => t.name === 'focus-meaning');

    if (focusFormType) {
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level)
        VALUES
          (${focusFormType.id}, 'She ___ to the store yesterday.', 'go', 'goes', 'went', 'going', 'C', '"Yesterday" indicates past tense, so "went" is correct.', 'A2'),
          (${focusFormType.id}, 'They have ___ working all day.', 'is', 'are', 'been', 'being', 'C', 'Present perfect continuous uses "have been" + -ing form.', 'B1'),
          (${focusFormType.id}, 'If I ___ rich, I would travel the world.', 'am', 'was', 'were', 'be', 'C', 'Second conditional uses "were" for all subjects in the if-clause.', 'B1'),
          (${focusFormType.id}, 'The book ___ by millions of people.', 'has read', 'has been read', 'have been read', 'is reading', 'B', 'Passive voice in present perfect: has/have been + past participle.', 'B2'),
          (${focusFormType.id}, 'She made him ___ the truth.', 'tell', 'to tell', 'telling', 'told', 'A', 'Make + object + base form of verb (without "to").', 'B1')
      `);
      console.log(`✅ Created 5 Focus on Form questions`);
    }

    if (focusMeaningType) {
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level)
        VALUES
          (${focusMeaningType.id}, 'The word "abundant" is closest in meaning to ___.', 'scarce', 'plentiful', 'limited', 'rare', 'B', '"Abundant" means existing in large quantities, which is synonymous with "plentiful".', 'B1'),
          (${focusMeaningType.id}, 'To "procrastinate" means to ___.', 'work quickly', 'delay doing something', 'finish early', 'plan ahead', 'B', '"Procrastinate" means to delay or postpone action.', 'B2'),
          (${focusMeaningType.id}, 'The opposite of "optimistic" is ___.', 'hopeful', 'positive', 'pessimistic', 'cheerful', 'C', '"Pessimistic" is the antonym of "optimistic".', 'A2'),
          (${focusMeaningType.id}, 'A "meticulous" person is ___.', 'careless', 'very careful about details', 'lazy', 'disorganized', 'B', '"Meticulous" describes someone who pays great attention to detail.', 'C1'),
          (${focusMeaningType.id}, 'To "enhance" something means to ___.', 'reduce it', 'improve it', 'destroy it', 'ignore it', 'B', '"Enhance" means to improve or increase the quality, value, or extent of something.', 'B2')
      `);
      console.log(`✅ Created 5 Focus on Meaning questions`);
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
