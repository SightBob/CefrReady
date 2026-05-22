-- Add SM-2 spaced repetition columns to flashcards
ALTER TABLE "flashcards" ADD COLUMN "ease_factor" numeric(3, 2) DEFAULT '2.5';
--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "review_interval" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "next_review_at" timestamp;
--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "consecutive_correct" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flashcards_due_idx" ON "flashcards" USING btree ("user_id","next_review_at");
