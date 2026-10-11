import { db } from '@/db';
import { testAttempts, userAnswers, questions } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { calculateFullTestResult } from './result';
import type { AttemptPathEntry } from './state';

export async function submitAttempt(attemptId: number, userId: string) {
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(testAttempts)
      .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId), eq(testAttempts.testTypeId, 'full-test')))
      .limit(1).for('update');
    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status === 'cancelled') throw new Error('Attempt was cancelled');
    const path = (attempt.adaptivePath ?? []) as AttemptPathEntry[];
    const legacyIds = path.filter((entry) => !entry.questionSnapshot).map((entry) => entry.questionId);
    const legacyQuestions = legacyIds.length ? await tx.select().from(questions).where(inArray(questions.id, legacyIds)) : [];
    const result = calculateFullTestResult(path, legacyQuestions);
    if (attempt.status === 'completed') return { ...result, attemptId, adaptivePath: attempt.adaptivePath ?? [] };
    const now = new Date();
    if (path.length) await tx.insert(userAnswers).values(path.map((entry) => ({
      attemptId, questionId: entry.questionId, selectedAnswer: entry.selectedAnswer, isCorrect: entry.wasCorrect, createdAt: now,
    })));
    await tx.execute(sql`
      INSERT INTO user_progress (user_id, test_type_id, average_score, tests_taken, last_attempt_at)
      VALUES (${userId}, 'full-test', ${result.score}, 1, now())
      ON CONFLICT (user_id, test_type_id) DO UPDATE SET
        tests_taken = COALESCE(user_progress.tests_taken, 0) + 1,
        average_score = ((COALESCE(user_progress.average_score, 0) * COALESCE(user_progress.tests_taken, 0)) + ${result.score}) / (COALESCE(user_progress.tests_taken, 0) + 1),
        last_attempt_at = now(), updated_at = now()
    `);
    await tx.update(testAttempts).set({ status: 'completed', score: result.score.toString(), totalQuestions: result.totalQuestions, correctAnswers: result.correctAnswers, completedAt: now })
      .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.status, 'in_progress')));
    return { ...result, attemptId, adaptivePath: attempt.adaptivePath ?? [] };
  });
}
