import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function addStructuredSampleQuestions() {
  console.log('📚 Adding structured sample questions to database...\n');

  try {
    // First, get test type IDs
    const testTypes = await db.execute(sql`
      SELECT id, name FROM test_types ORDER BY id
    `);

    console.log('Found test types:', testTypes.rows);

    const focusFormId = (testTypes.rows as any[]).find(t => t.name === 'focus-form')?.id;
    const focusMeaningId = (testTypes.rows as any[]).find(t => t.name === 'focus-meaning')?.id;
    const formMeaningId = (testTypes.rows as any[]).find(t => t.name === 'form-meaning')?.id;
    const listeningId = (testTypes.rows as any[]).find(t => t.name === 'listening')?.id;

    if (focusFormId) {
      console.log('\n📝 Adding Focus on Form questions...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active)
        VALUES
          (${focusFormId}, 'She ___ to the store yesterday.', 'go', 'goes', 'went', 'going', 'C', '"Yesterday" indicates past tense, so "went" is correct.', 'A2', 'easy', 'true'),
          (${focusFormId}, 'They have ___ working all day.', 'is', 'are', 'been', 'being', 'C', 'Present perfect continuous uses "have been" + -ing form.', 'B1', 'medium', 'true')
      `);
      console.log('✅ Added 2 Focus on Form questions');
    }

    if (focusMeaningId) {
      console.log('\n📝 Adding Focus on Meaning questions with conversation structure...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active, conversation)
        VALUES
          (${focusMeaningId}, 'What does "get back to me" mean?', 'Return to the office', 'Contact me with a response', 'Go back home', 'Send an email', 'B', '"Get back to someone" means to contact them with a response or answer.', 'B1', 'easy', 'true',
           '[{"speaker":"A","text":"Hey, how was your interview yesterday?"},{"speaker":"B","text":"It went quite well, actually. The manager was really impressed with my portfolio."},{"speaker":"A","text":"That\'s great! When will you hear back from them?"},{"speaker":"B","text":"They said they\'d get back to me by the end of the week."}]'::jsonb),
          (${focusMeaningId}, 'What does "cost an arm and a leg" mean?', 'Require physical effort', 'Be very expensive', 'Need special permission', 'Take a long time', 'B', '"Cost an arm and a leg" is an idiom meaning something is very expensive.', 'B2', 'medium', 'true',
           '[{"speaker":"A","text":"I heard you\'re moving to a new apartment."},{"speaker":"B","text":"Yes, I finally found a place that doesn\'t cost an arm and a leg."},{"speaker":"A","text":"That\'s lucky! Housing prices have been crazy lately."},{"speaker":"B","text":"Tell me about it. I\'ve been looking for months."}]'::jsonb)
      `);
      console.log('✅ Added 2 Focus on Meaning questions with conversation data');
    }

    if (formMeaningId) {
      console.log('\n📝 Adding Form & Meaning questions with article structure...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active, article)
        VALUES
          (${formMeaningId}, 'Fill in the blank: Learning a new language is a ___ journey.', 'rewarding', 'challenging', 'boring', 'easy', 'A', '"Rewarding" gives satisfaction, which fits the positive context.', 'B1', 'easy', 'true',
           '{"title":"The Importance of Learning Languages","text":"Learning a new language is a {{1}} journey that opens many doors.","blanks":[{"id":1,"correctAnswer":"rewarding","hint":"adjective - giving satisfaction"}]}'::jsonb),
          (${formMeaningId}, 'Fill in the blank: It requires ___ and dedication.', 'patience', 'speed', 'money', 'luck', 'A', '"Patience" is the ability to wait calmly, which pairs with "dedication".', 'B1', 'medium', 'true',
           '{"title":"The Importance of Learning Languages","text":"It requires {{1}} and dedication.","blanks":[{"id":1,"correctAnswer":"patience","hint":"noun - ability to wait calmly"}]}'::jsonb)
      `);
      console.log('✅ Added 2 Form & Meaning questions with article data');
    }

    if (listeningId) {
      console.log('\n📝 Adding Listening questions with audio structure...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active, audio_url, transcript)
        VALUES
          (${listeningId}, 'When is the meeting?', 'This morning', 'At 3 PM', 'In Conference Room A', 'Tomorrow', 'B', 'The speaker says "Today\'s meeting has been rescheduled to 3 PM".', 'A2', 'easy', 'true',
           '/audio/listening/meeting-reschedule.mp3', 'Good morning, everyone. Today\'s meeting has been rescheduled to 3 PM in Conference Room B. Please bring your quarterly reports. Thank you.'),
          (${listeningId}, 'Where is the package?', 'At the post office', 'In the mailbox', 'At the front desk', 'With the delivery person', 'C', 'The speaker says "your package has been delivered to the front desk".', 'A2', 'easy', 'true',
           '/audio/listening/package-delivery.mp3', 'I\'m calling to inform you that your package has been delivered to the front desk. Please pick it up at your earliest convenience.')
      `);
      console.log('✅ Added 2 Listening questions with audio data');
    }

    console.log('\n✨ All structured sample questions added successfully!');

    // Show summary
    const questionCount = await db.execute(sql`
      SELECT test_type_id, COUNT(*) as count FROM questions GROUP BY test_type_id
    `);
    console.log('\n📊 Question summary:');
    console.log(questionCount.rows);

  } catch (error) {
    console.error('❌ Error adding structured questions:', error);
    throw error;
  }
}

addStructuredSampleQuestions()
  .then(() => {
    console.log('\n🎉 Script finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });