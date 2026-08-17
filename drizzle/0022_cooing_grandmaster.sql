ALTER TABLE "test_feedback" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "test_feedback" ADD COLUMN "featured_at" timestamp;--> statement-breakpoint
CREATE INDEX "test_feedback_featured_idx" ON "test_feedback" USING btree ("is_featured","featured_at");