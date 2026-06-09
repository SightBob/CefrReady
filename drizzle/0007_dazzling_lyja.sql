DROP INDEX IF EXISTS "test_feedback_attempt_idx";--> statement-breakpoint
ALTER TABLE "test_feedback" ADD CONSTRAINT "test_feedback_attempt_unique" UNIQUE("attempt_id");