CREATE TABLE "learning_path_backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_nodes" ADD COLUMN "pass_score" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_pages" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_path_backups" ADD CONSTRAINT "learning_path_backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_path_backups_created_at_idx" ON "learning_path_backups" USING btree ("created_at");