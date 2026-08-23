ALTER TABLE "questions" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "demo_order" integer;--> statement-breakpoint
CREATE INDEX "questions_demo_idx" ON "questions" USING btree ("test_type_id","is_demo");