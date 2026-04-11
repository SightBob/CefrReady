import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function addSampleQuestions() {
  console.log('📚 Adding sample questions to database...\n');

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
          (${focusFormId}, 'They have ___ working all day.', 'is', 'are', 'been', 'being', 'C', 'Present perfect continuous uses "have been" + -ing form.', 'B1', 'medium', 'true'),
          (${focusFormId}, 'If I ___ rich, I would travel the world.', 'am', 'was', 'were', 'be', 'C', 'Second conditional uses "were" for all subjects in the if-clause.', 'B1', 'medium', 'true'),
          (${focusFormId}, 'The book ___ by millions of people.', 'has read', 'has been read', 'have been read', 'is reading', 'B', 'Passive voice in present perfect: has/have been + past participle.', 'B2', 'hard', 'true'),
          (${focusFormId}, 'She made him ___ the truth.', 'tell', 'to tell', 'telling', 'told', 'A', 'Make + object + base form of verb (without "to").', 'B1', 'medium', 'true'),
          (${focusFormId}, 'The children ___ playing in the garden when it started to rain.', 'is', 'are', 'was', 'were', 'D', 'Past continuous with plural subject requires "were".', 'A2', 'easy', 'true'),
          (${focusFormId}, 'I wish I ___ speak French fluently.', 'can', 'could', 'would', 'will', 'B', '"Wish" for present situations takes "could" for abilities.', 'B1', 'medium', 'true'),
          (${focusFormId}, 'Neither the teacher nor the students ___ present.', 'is', 'are', 'was', 'were', 'B', 'With "neither...nor", the verb agrees with the nearest subject.', 'B2', 'hard', 'true'),
          (${focusFormId}, 'It''s time we ___ home.', 'go', 'went', 'going', 'gone', 'B', '"It''s time" is followed by past tense for present meaning.', 'B1', 'medium', 'true'),
          (${focusFormId}, 'Had I known about the meeting, I ___ have attended.', 'will', 'would', 'shall', 'can', 'B', 'Third conditional: "would have" for hypothetical past situations.', 'B2', 'hard', 'true')
      `);
      console.log('✅ Added 10 Focus on Form questions');
    }

    if (focusMeaningId) {
      console.log('\n📝 Adding Focus on Meaning questions...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active)
        VALUES
          (${focusMeaningId}, 'The word "abundant" is closest in meaning to ___.', 'scarce', 'plentiful', 'limited', 'rare', 'B', '"Abundant" means existing in large quantities, synonymous with "plentiful".', 'B1', 'easy', 'true'),
          (${focusMeaningId}, 'To "procrastinate" means to ___.', 'work quickly', 'delay doing something', 'finish early', 'plan ahead', 'B', '"Procrastinate" means to delay or postpone action.', 'B2', 'medium', 'true'),
          (${focusMeaningId}, 'The opposite of "optimistic" is ___.', 'hopeful', 'positive', 'pessimistic', 'cheerful', 'C', '"Pessimistic" is the antonym of "optimistic".', 'A2', 'easy', 'true'),
          (${focusMeaningId}, 'A "meticulous" person is ___.', 'careless', 'very careful about details', 'lazy', 'disorganized', 'B', '"Meticulous" describes someone who pays great attention to detail.', 'C1', 'hard', 'true'),
          (${focusMeaningId}, 'To "enhance" something means to ___.', 'reduce it', 'improve it', 'destroy it', 'ignore it', 'B', '"Enhance" means to improve or increase the quality, value, or extent of something.', 'B2', 'medium', 'true'),
          (${focusMeaningId}, 'The word "benevolent" means ___.', 'cruel', 'kind', 'angry', 'selfish', 'B', '"Benevolent" means well-meaning and kindly.', 'B2', 'medium', 'true'),
          (${focusMeaningId}, '"Ambiguous" means ___.', 'clear', 'uncertain', 'obvious', 'certain', 'B', '"Ambiguous" means open to more than one interpretation.', 'C1', 'hard', 'true'),
          (${focusMeaningId}, 'The word "diligent" is closest to ___.', 'lazy', 'hardworking', 'careless', 'slow', 'B', '"Diligent" means having or showing care in one''s work.', 'B1', 'medium', 'true'),
          (${focusMeaningId}, '"Ephemeral" means ___.', 'permanent', 'short-lived', 'heavy', 'light', 'B', '"Ephemeral" means lasting for a very short time.', 'C1', 'hard', 'true'),
          (${focusMeaningId}, 'The word "generous" means ___.', 'selfish', 'giving', 'stingy', 'mean', 'B', '"Generous" means showing a readiness to give more than is necessary.', 'A2', 'easy', 'true')
      `);
      console.log('✅ Added 10 Focus on Meaning questions');
    }

    if (formMeaningId) {
      console.log('\n📝 Adding Form & Meaning questions...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active)
        VALUES
          (${formMeaningId}, 'Despite the rain, they ___ the match.', 'cancel', 'cancelled', 'didn''t cancel', 'cancelling', 'C', 'Despite indicates contrast - the match continued despite rain.', 'B1', 'medium', 'true'),
          (${formMeaningId}, 'He is ___ than his brother.', 'tall', 'taller', 'tallest', 'more tall', 'B', 'Comparative form of "tall" is "taller".', 'A2', 'easy', 'true'),
          (${formMeaningId}, 'I look forward to ___ from you.', 'hear', 'hearing', 'heard', 'hears', 'B', '"Look forward to" is followed by gerund (-ing form).', 'B1', 'medium', 'true'),
          (${formMeaningId}, 'The meeting was ___ because the CEO was ill.', 'called off', 'called in', 'called on', 'called up', 'A', '"Call off" means to cancel.', 'B2', 'medium', 'true'),
          (${formMeaningId}, 'By next year, I ___ here for ten years.', 'will work', 'will have worked', 'have worked', 'am working', 'B', 'Future perfect for actions completed by a future time.', 'C1', 'hard', 'true'),
          (${formMeaningId}, 'She is used to ___ early.', 'wake up', 'woke up', 'waking up', 'woken up', 'C', '"Be used to" is followed by gerund.', 'B1', 'medium', 'true'),
          (${formMeaningId}, 'Hardly ___ I arrived when the phone rang.', 'did', 'had', 'was', 'have', 'B', 'Inversion with "hardly" requires past perfect.', 'C1', 'hard', 'true'),
          (${formMeaningId}, 'You ___ have told me earlier!', 'must', 'should', 'might', 'could', 'B', '"Should have" expresses regret about the past.', 'B2', 'medium', 'true'),
          (${formMeaningId}, 'The teacher asked us ___ quiet.', 'be', 'to be', 'being', 'been', 'B', '"Ask" is followed by infinitive with "to".', 'A2', 'easy', 'true'),
          (${formMeaningId}, 'I would rather you ___ smoke here.', 'don''t', 'didn''t', 'not', 'won''t', 'B', '"Would rather" with different subject uses past tense.', 'C1', 'hard', 'true')
      `);
      console.log('✅ Added 10 Form & Meaning questions');
    }

    if (listeningId) {
      console.log('\n📝 Adding Listening questions (text-based for demo)...');
      await db.execute(sql`
        INSERT INTO questions (test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, cefr_level, difficulty, active)
        VALUES
          (${listeningId}, '[Audio Script: "The meeting starts at 10 AM tomorrow."] What time does the meeting start?', '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', 'B', 'The speaker clearly states "10 AM tomorrow".', 'A2', 'easy', 'true'),
          (${listeningId}, '[Audio Script: "I''ll meet you at the main entrance, not the side door."] Where will they meet?', 'Side door', 'Main entrance', 'Back entrance', 'Parking lot', 'B', 'The speaker specifies "main entrance".', 'A2', 'easy', 'true'),
          (${listeningId}, '[Audio Script: "The flight has been delayed due to bad weather."] Why was the flight delayed?', 'Technical issues', 'Bad weather', 'Staff shortage', 'Late arrival', 'B', 'The speaker mentions "bad weather" as the reason.', 'A2', 'easy', 'true'),
          (${listeningId}, '[Audio Script: "Could you please repeat that? I didn''t catch it."] What does the speaker want?', 'To speak louder', 'To hear again', 'To leave', 'To start over', 'B', '"Repeat that" means to say it again.', 'A2', 'easy', 'true'),
          (${listeningId}, '[Audio Script: "The conference room is on the third floor, next to the elevator."] Where is the conference room?', 'Second floor', 'Third floor', 'Fourth floor', 'Ground floor', 'B', 'The speaker says "third floor".', 'A2', 'easy', 'true'),
          (${listeningId}, '[Audio Script: "I''m afraid I can''t make it to the party. I have to work late."] What does the speaker mean?', 'Will be late', 'Cannot attend', 'Will arrive early', 'Is unsure', 'B', '"Can''t make it" means cannot attend.', 'B1', 'medium', 'true'),
          (${listeningId}, '[Audio Script: "The deadline has been extended to next Friday."] What happened to the deadline?', 'Moved earlier', 'Moved later', 'Cancelled', 'Same day', 'B', '"Extended" means moved to a later date.', 'B1', 'medium', 'true'),
          (${listeningId}, '[Audio Script: "Let''s touch base next week to discuss the project."] What does "touch base" mean?', 'Play baseball', 'Make contact', 'Finish work', 'Argue', 'B', '"Touch base" is an idiom meaning to make contact.', 'B2', 'medium', 'true'),
          (${listeningId}, '[Audio Script: "The presentation will cover Q3 sales figures and Q4 projections."] What will be discussed?', 'Past sales only', 'Future sales only', 'Past and future sales', 'Marketing strategy', 'C', 'Q3 is past, Q4 projections are future.', 'B2', 'medium', 'true'),
          (${listeningId}, '[Audio Script: "We''re experiencing some technical difficulties. Please bear with us."] What does "bear with us" mean?', 'Leave the room', 'Be patient', 'Help fix', 'Complain', 'B', '"Bear with us" means to be patient.', 'B2', 'medium', 'true')
      `);
      console.log('✅ Added 10 Listening questions');
    }

    console.log('\n✨ All sample questions added successfully!');

    // Show summary
    const questionCount = await db.execute(sql`
      SELECT test_type_id, COUNT(*) as count FROM questions GROUP BY test_type_id
    `);
    console.log('\n📊 Question summary:');
    console.log(questionCount.rows);

  } catch (error) {
    console.error('❌ Error adding questions:', error);
    throw error;
  }
}

addSampleQuestions()
  .then(() => {
    console.log('\n🎉 Script finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
