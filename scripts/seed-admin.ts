import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function seedAdminData() {
  console.log('🌱 Starting admin data seeding with refactored schema...');

  try {
    // First, drop existing tables to recreate with new schema
    console.log('🔄 Dropping existing tables...');
    await db.execute(sql`DROP TABLE IF EXISTS user_answers CASCADE`);
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

    // Recreate test_types with string PKs
    console.log('📝 Creating test_types table with string PKs...');
    await db.execute(sql`
      CREATE TABLE test_types (
        id VARCHAR(50) PRIMARY KEY,
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
        test_type_id VARCHAR(50) NOT NULL REFERENCES test_types(id),
        question_text TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_answer VARCHAR(1),
        explanation TEXT,
        conversation JSONB,
        audio_url TEXT,
        transcript TEXT,
        article JSONB,
        cefr_level VARCHAR(10) NOT NULL,
        difficulty VARCHAR(20),
        active VARCHAR(5) DEFAULT 'true' NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create test_attempts table with numeric scores
    console.log('📝 Creating test_attempts table with numeric scores...');
    await db.execute(sql`
      CREATE TABLE test_attempts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_type_id VARCHAR(50) NOT NULL REFERENCES test_types(id),
        score NUMERIC(5,2),
        total_questions INTEGER,
        correct_answers INTEGER,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create user_answers table for per-question storage
    console.log('📝 Creating user_answers table...');
    await db.execute(sql`
      CREATE TABLE user_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id),
        selected_answer VARCHAR(50) NOT NULL,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create user_progress table with numeric average_score
    console.log('📝 Creating user_progress table with numeric scores...');
    await db.execute(sql`
      CREATE TABLE user_progress (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_type_id VARCHAR(50) NOT NULL REFERENCES test_types(id),
        average_score NUMERIC(5,2),
        tests_taken INTEGER DEFAULT 0,
        last_attempt_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (user_id, test_type_id)
      )
    `);

    console.log('📝 Creating test types with string identifiers...');
    await db.execute(sql`
      INSERT INTO test_types (id, name, description, duration, active)
      VALUES
        ('focus-form', 'Focus on Form', 'Test your knowledge of grammatical structures, verb forms, and sentence patterns.', 15, 'true'),
        ('focus-meaning', 'Focus on Meaning', 'Understand vocabulary meanings, synonyms, and contextual usage.', 20, 'true'),
        ('form-meaning', 'Form & Meaning', 'Combined assessment of both grammatical accuracy and semantic understanding.', 25, 'true'),
        ('listening', 'Listening', 'Comprehend spoken English through audio passages and conversations.', 30, 'true')
    `);

    console.log('📚 Creating structured sample questions for all 4 test types...');

    // Focus on Form questions
    await db.execute(sql`
      INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active)
      VALUES
        ('focus-form', 'She ___ to the store yesterday.', 'go', 'goes', 'went', 'going', 'C', '"Yesterday" indicates past tense, so "went" is correct.', 'A2', 'easy', 'true'),
        ('focus-form', 'They have ___ working all day.', 'is', 'are', 'been', 'being', 'C', 'Present perfect continuous uses "have been" + -ing form.', 'B1', 'medium', 'true'),
        ('focus-form', 'If I ___ rich, I would travel the world.', 'am', 'was', 'were', 'be', 'C', 'Second conditional uses "were" for all subjects in the if-clause.', 'B1', 'medium', 'true'),
        ('focus-form', 'The book ___ by millions of people.', 'has read', 'has been read', 'have been read', 'is reading', 'B', 'Passive voice in present perfect: has/have been + past participle.', 'B2', 'hard', 'true'),
        ('focus-form', 'She made him ___ the truth.', 'tell', 'to tell', 'telling', 'told', 'A', 'Make + object + base form of verb (without "to").', 'B1', 'medium', 'true')
    `);
    console.log('✅ Created 5 Focus on Form questions');

    // Focus on Meaning questions with conversation structure
    await db.execute(sql`
      INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active, conversation)
      VALUES
        ('focus-meaning', 'What does "get back to me" mean?', 'Return to the office', 'Contact me with a response', 'Go back home', 'Send an email', 'B', '"Get back to someone" means to contact them with a response or answer.', 'B1', 'easy', 'true',
         '[{"speaker":"A","text":"Hey, how was your interview yesterday?"},{"speaker":"B","text":"It went quite well, actually."},{"speaker":"A","text":"When will you hear back?"},{"speaker":"B","text":"They said they would get back to me by end of week."}]'::jsonb),
        ('focus-meaning', 'What does "cost an arm and a leg" mean?', 'Require physical effort', 'Be very expensive', 'Need special permission', 'Take a long time', 'B', '"Cost an arm and a leg" is an idiom meaning something is very expensive.', 'B2', 'medium', 'true',
         '[{"speaker":"A","text":"I heard you are moving to a new apartment."},{"speaker":"B","text":"Yes, I found a place that does not cost an arm and a leg."},{"speaker":"A","text":"That is lucky!"},{"speaker":"B","text":"I have been looking for months."}]'::jsonb),
        ('focus-meaning', 'What does "burn the midnight oil" mean?', 'Work late into the night', 'Save electricity', 'Cook dinner late', 'Stay up all night', 'A', '"Burn the midnight oil" means to work late into the night.', 'B1', 'easy', 'true',
         '[{"speaker":"A","text":"You look tired today."},{"speaker":"B","text":"I was burning the midnight oil finishing my project."},{"speaker":"A","text":"Hope it was worth it!"},{"speaker":"B","text":"The deadline was this morning."}]'::jsonb),
        ('focus-meaning', 'What does "put his foot in his mouth" mean?', 'Step on something', 'Say something embarrassing', 'Hurt himself', 'Make a good impression', 'B', '"Put one''s foot in one''s mouth" means to say something embarrassing or tactless.', 'B2', 'medium', 'true',
         '[{"speaker":"A","text":"Did you hear what John said at the meeting?"},{"speaker":"B","text":"Yes, he really put his foot in his mouth this time."},{"speaker":"A","text":"He should have thought before speaking."},{"speaker":"B","text":"Everyone was shocked."}]'::jsonb),
        ('focus-meaning', 'What does "on the fence" mean?', 'Sitting on a fence', 'Undecided about something', 'Making a decision', 'Being outdoors', 'B', '"On the fence" means being undecided or uncertain about something.', 'B1', 'easy', 'true',
         '[{"speaker":"A","text":"Have you decided which university to attend?"},{"speaker":"B","text":"I''m still on the fence between State and City University."},{"speaker":"A","text":"Both are good choices."},{"speaker":"B","text":"I need to visit both campuses again."}]'::jsonb)
    `);
    console.log('✅ Created 5 Focus on Meaning questions with conversation data');

    // Form & Meaning questions with article structure
    await db.execute(sql`
      INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active, article)
      VALUES
        ('form-meaning', 'Fill in the blank: Learning a new language is a ___ journey.', 'rewarding', 'challenging', 'boring', 'easy', 'A', '"Rewarding" gives satisfaction, which fits the positive context.', 'B1', 'easy', 'true',
         '{"title":"The Importance of Learning Languages","text":"Learning a new language is a {{1}} journey that opens many doors.","blanks":[{"id":1,"correctAnswer":"rewarding","hint":"adjective - giving satisfaction"}]}'::jsonb),
        ('form-meaning', 'Fill in the blank: It requires ___ and dedication.', 'patience', 'speed', 'money', 'luck', 'A', '"Patience" is the ability to wait calmly, which pairs with "dedication".', 'B1', 'medium', 'true',
         '{"title":"The Importance of Learning Languages","text":"It requires {{1}} and dedication.","blanks":[{"id":1,"correctAnswer":"patience","hint":"noun - ability to wait calmly"}]}'::jsonb),
        ('form-meaning', 'Fill in the blank: With consistent practice, anyone can ___ fluency.', 'master', 'learn', 'achieve', 'gain', 'C', '"Achieve fluency" is the correct collocation for reaching language proficiency.', 'B2', 'medium', 'true',
         '{"title":"The Importance of Learning Languages","text":"With consistent practice, anyone can {{1}} fluency.","blanks":[{"id":1,"correctAnswer":"achieve","hint":"verb - to successfully reach a goal"}]}'::jsonb),
        ('form-meaning', 'Fill in the blank: The cognitive ___ of learning languages are well-documented.', 'benefits', 'advantages', 'profits', 'gains', 'A', '"Cognitive benefits" is the standard phrase for mental advantages.', 'C1', 'hard', 'true',
         '{"title":"The Importance of Learning Languages","text":"The cognitive {{1}} of learning languages are well-documented.","blanks":[{"id":1,"correctAnswer":"benefits","hint":"noun - positive effects or advantages"}]}'::jsonb),
        ('form-meaning', 'Fill in the blank: Language learning builds ___ communication skills.', 'effective', 'efficient', 'excellent', 'enhanced', 'A', '"Effective communication skills" is the most natural collocation here.', 'B2', 'medium', 'true',
         '{"title":"The Importance of Learning Languages","text":"Language learning builds {{1}} communication skills.","blanks":[{"id":1,"correctAnswer":"effective","hint":"adjective - successful in producing the desired result"}]}'::jsonb)
    `);
    console.log('✅ Created 5 Form & Meaning questions with article data');

    // Listening questions with audio structure
    await db.execute(sql`
      INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active, audio_url, transcript)
      VALUES
        ('listening', 'When is the meeting?', 'This morning', 'At 3 PM', 'In Conference Room A', 'Tomorrow', 'B', 'The speaker says the meeting has been rescheduled to 3 PM.', 'A2', 'easy', 'true',
         '/audio/listening/meeting-reschedule.mp3', 'Good morning, everyone. Today meeting has been rescheduled to 3 PM in Conference Room B. Please bring your quarterly reports. Thank you.'),
        ('listening', 'Where is the package?', 'At the post office', 'In the mailbox', 'At the front desk', 'With the delivery person', 'C', 'The speaker says the package has been delivered to the front desk.', 'A2', 'easy', 'true',
         '/audio/listening/package-delivery.mp3', 'I am calling to inform you that your package has been delivered to the front desk. Please pick it up at your earliest convenience.'),
        ('listening', 'What are the museum hours today?', '9 AM to 5 PM', '10 AM to 6 PM', 'Closed today', '11 AM to 7 PM', 'B', 'The speaker states the museum is open from 10 AM to 6 PM today.', 'A2', 'easy', 'true',
         '/audio/listening/museum-hours.mp3', 'Hello, this is the City Museum. We are open today from 10 AM to 6 PM. Admission is free for students with valid ID. We hope to see you soon.'),
        ('listening', 'Why was the outdoor event cancelled?', 'Bad weather', 'Low attendance', 'Venue issues', 'Staff shortage', 'A', 'The speaker mentions heavy rain as the reason for cancellation.', 'A2', 'easy', 'true',
         '/audio/listening/outdoor-cancellation.mp3', 'Attention all participants. Due to the heavy rain forecast for this weekend, the outdoor festival has been cancelled. We apologize for any inconvenience and will reschedule for next month.'),
        ('listening', 'Which gate should passengers go to?', 'Gate A12', 'Gate B8', 'Gate C15', 'Gate D3', 'B', 'The announcement specifies Gate B8 for the delayed flight.', 'A2', 'easy', 'true',
         '/audio/listening/airport-directions.mp3', 'Attention passengers for Flight 452 to London. Your flight has been delayed by 30 minutes. Please proceed to Gate B8 when boarding begins. Thank you for your patience.')
    `);
    console.log('✅ Created 5 Listening questions with audio data');

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