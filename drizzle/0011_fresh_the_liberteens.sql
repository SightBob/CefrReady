CREATE TABLE IF NOT EXISTS "question_selection_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"test_type_id" varchar(50) NOT NULL,
	"question_id" integer NOT NULL,
	"target_level" varchar(10) NOT NULL,
	"selected_level" varchar(10) NOT NULL,
	"mode" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_selection_logs" ADD CONSTRAINT "question_selection_logs_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_selection_logs" ADD CONSTRAINT "question_selection_logs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qsl_attempt_idx" ON "question_selection_logs" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qsl_type_idx" ON "question_selection_logs" USING btree ("test_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qsl_mode_idx" ON "question_selection_logs" USING btree ("mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qsl_created_at_idx" ON "question_selection_logs" USING btree ("created_at");