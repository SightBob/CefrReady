CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_type_id" varchar(50) NOT NULL,
	"question_text" text NOT NULL,
	"option_a" text,
	"option_b" text,
	"option_c" text,
	"option_d" text,
	"correct_answer" varchar(1),
	"explanation" text,
	"conversation" jsonb,
	"audio_url" text,
	"transcript" text,
	"article" jsonb,
	"cefr_level" varchar(10) NOT NULL,
	"difficulty" varchar(20),
	"active" varchar(5) DEFAULT 'true' NOT NULL,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_type_id" varchar(50) NOT NULL,
	"test_set_id" integer,
	"score" varchar(10),
	"total_questions" integer,
	"correct_answers" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_set_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_set_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_types" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(50),
	"duration" integer,
	"question_count" integer,
	"active" varchar(5) DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"selected_answer" varchar(50) NOT NULL,
	"is_correct" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_type_id" varchar(50) NOT NULL,
	"average_score" varchar(10),
	"tests_taken" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_test_type_id_test_types_id_fk" FOREIGN KEY ("test_type_id") REFERENCES "public"."test_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_type_id_test_types_id_fk" FOREIGN KEY ("test_type_id") REFERENCES "public"."test_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_set_id_test_sets_id_fk" FOREIGN KEY ("test_set_id") REFERENCES "public"."test_sets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_set_questions" ADD CONSTRAINT "test_set_questions_test_set_id_test_sets_id_fk" FOREIGN KEY ("test_set_id") REFERENCES "public"."test_sets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_set_questions" ADD CONSTRAINT "test_set_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_sets" ADD CONSTRAINT "test_sets_section_id_test_types_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."test_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_test_type_id_test_types_id_fk" FOREIGN KEY ("test_type_id") REFERENCES "public"."test_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_test_type_idx" ON "questions" USING btree ("test_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_cefr_idx" ON "questions" USING btree ("cefr_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_active_idx" ON "questions" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_attempts_user_id_idx" ON "test_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_attempts_test_type_idx" ON "test_attempts" USING btree ("test_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_attempts_set_idx" ON "test_attempts" USING btree ("test_set_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tsq_set_idx" ON "test_set_questions" USING btree ("test_set_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tsq_unique" ON "test_set_questions" USING btree ("test_set_id","question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_sets_section_idx" ON "test_sets" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_sets_order_idx" ON "test_sets" USING btree ("section_id","order_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_answers_attempt_idx" ON "user_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_answers_question_idx" ON "user_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_user_id_idx" ON "user_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_test_type_idx" ON "user_progress" USING btree ("test_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_unique" ON "user_progress" USING btree ("user_id","test_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");