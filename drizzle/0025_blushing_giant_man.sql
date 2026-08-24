DROP INDEX "user_progress_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "user_progress_unique" ON "user_progress" USING btree ("user_id","test_type_id");