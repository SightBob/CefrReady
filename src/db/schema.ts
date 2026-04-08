import { pgTable, serial, text, timestamp, varchar, integer, boolean, numeric, primaryKey, index, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================
// Auth Tables (NextAuth compatible) — unchanged
// ============================================================

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  compositePk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
}));

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').notNull().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  compositePk: primaryKey({ columns: [table.identifier, table.token] }),
}));

// ============================================================
// Application Tables
// ============================================================

// Test types: PK is now the string identifier (e.g. 'focus-form')
export const testTypes = pgTable('test_types', {
  id: varchar('id', { length: 50 }).primaryKey(),  // 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 50 }),
  duration: integer('duration'),
  questionCount: integer('question_count'),
  active: varchar('active', { length: 5 }).default('true').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
});

// Questions: testTypeId references testTypes.id (varchar PK)
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  testTypeId: varchar('test_type_id', { length: 50 }).notNull().references(() => testTypes.id),
  questionText: text('question_text').notNull(),
  optionA: text('option_a'),
  optionB: text('option_b'),
  optionC: text('option_c'),
  optionD: text('option_d'),
  correctAnswer: varchar('correct_answer', { length: 1 }),
  explanation: text('explanation'),

  // Structured data for complex question types
  conversation: jsonb('conversation'),  // focus-meaning: [{speaker, text}]
  audioUrl: text('audio_url'),          // listening: audio file URL
  transcript: text('transcript'),       // listening: audio transcript
  article: jsonb('article'),            // form-meaning: {title, text, blanks[]}

  cefrLevel: varchar('cefr_level', { length: 10 }).notNull(),
  difficulty: varchar('difficulty', { length: 20 }),
  active: varchar('active', { length: 5 }).default('true').notNull(),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
}, (table) => ({
  testTypeIdx: index('questions_test_type_idx').on(table.testTypeId),
  cefrIdx: index('questions_cefr_idx').on(table.cefrLevel),
  activeIdx: index('questions_active_idx').on(table.active),
}));

// Test attempts: score stored as string (percentage with 2 decimal places)
export const testAttempts = pgTable('test_attempts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  testTypeId: varchar('test_type_id', { length: 50 }).notNull().references(() => testTypes.id),
  score: varchar('score', { length: 10 }),
  totalQuestions: integer('total_questions'),
  correctAnswers: integer('correct_answers'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
}, (table) => ({
  userIdIdx: index('test_attempts_user_id_idx').on(table.userId),
  testTypeIdx: index('test_attempts_test_type_idx').on(table.testTypeId),
}));

// Per-question answers: stored for review and analytics
export const userAnswers = pgTable('user_answers', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').notNull().references(() => testAttempts.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questions.id),
  selectedAnswer: varchar('selected_answer', { length: 50 }).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  attemptIdx: index('user_answers_attempt_idx').on(table.attemptId),
  questionIdx: index('user_answers_question_idx').on(table.questionId),
}));

// User progress: averageScore stored as string (percentage with 2 decimal places)
export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  testTypeId: varchar('test_type_id', { length: 50 }).notNull().references(() => testTypes.id),
  averageScore: varchar('average_score', { length: 10 }),
  testsTaken: integer('tests_taken').default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
}, (table) => ({
  userIdIdx: index('user_progress_user_id_idx').on(table.userId),
  testTypeIdx: index('user_progress_test_type_idx').on(table.testTypeId),
  uniqueUserTestType: index('user_progress_unique').on(table.userId, table.testTypeId),
}));

// ============================================================
// Drizzle-inferred types (for DB layer use)
// ============================================================

export type AuthUser = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type DbQuestion = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type DbTestType = typeof testTypes.$inferSelect;
export type NewTestType = typeof testTypes.$inferInsert;
export type DbUserProgress = typeof userProgress.$inferSelect;
export type NewUserProgress = typeof userProgress.$inferInsert;
export type DbTestAttempt = typeof testAttempts.$inferSelect;
export type NewTestAttempt = typeof testAttempts.$inferInsert;
export type DbUserAnswer = typeof userAnswers.$inferSelect;
export type NewUserAnswer = typeof userAnswers.$inferInsert;
