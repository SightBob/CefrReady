ALTER TABLE "test_attempts" ADD COLUMN "status" varchar(20) DEFAULT 'in_progress' NOT NULL;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "current_level" varchar(10);--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "time_remaining_seconds" integer;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "last_activity_at" timestamp;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "adaptive_path" jsonb DEFAULT '[]'::jsonb;
