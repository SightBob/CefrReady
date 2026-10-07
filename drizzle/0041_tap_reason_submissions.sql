-- Tap & Select เหตุผลที่ผู้เรียนพิมพ์ — เก็บเฉพาะที่พิมพ์จริง; admin ตั้งคะแนนเก็บรายเหตุผลได้
CREATE TABLE IF NOT EXISTS "tap_reason_submissions" (
	"id" serial PRIMARY KEY,
	"attempt_id" integer NOT NULL REFERENCES "test_attempts"("id") ON DELETE CASCADE,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"question_id" integer NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
	"item_index" integer NOT NULL,
	"reason" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"reward_points" integer,
	"scored_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
-- หนึ่งเหตุผลต่อหนึ่งข้อย่อยต่อหนึ่ง attempt (กัน resubmit ซ้ำ)
CREATE UNIQUE INDEX IF NOT EXISTS "tap_reason_submission_unique" ON "tap_reason_submissions" ("attempt_id","question_id","item_index");
CREATE INDEX IF NOT EXISTS "tap_reason_submissions_user_idx" ON "tap_reason_submissions" ("user_id");
-- หน้า admin กรอง "ยังไม่ได้ให้คะแนน" ก่อน (rewardPoints IS NULL) แล้วค่อยของเก่า
CREATE INDEX IF NOT EXISTS "tap_reason_submissions_unscored_idx" ON "tap_reason_submissions" ("reward_points","created_at");
