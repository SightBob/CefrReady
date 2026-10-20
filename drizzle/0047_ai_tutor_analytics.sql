-- 0047_ai_tutor_analytics
--
-- เก็บข้อมูลเพื่อวิเคราะห์คำถามของผู้เรียน + feedback
--
-- 1) ai_tutor_messages เพิ่มคอลัมน์:
--    selected_answer — คำตอบที่ผู้เรียนเลือก (คำนวณจาก proof ที่ลงชื่อไว้ฝั่ง server)
--    is_correct      — ผู้เรียนตอบถูกไหม (คำนวณเทียบกับเฉลยใน DB)
--    category        — หมวดคำถาม (เตรียมไว้ ยังไม่จัดอัตโนมัติ)
--    fallback_used   — ครั้งนี้ต้องสลับไปใช้โมเดลสำรองไหม
--    finish_reason   — finish_reason ของโมเดล (stop / length …) ใช้แยกว่าคำตอบถูกตัด
-- 2) ai_tutor_feedback — ผู้เรียนกด 👍/👎 ต่อข้อความ AI (หนึ่งคนกดได้หนึ่งครั้งต่อข้อความ)
ALTER TABLE "ai_tutor_messages" ADD COLUMN IF NOT EXISTS "selected_answer" text;
--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ADD COLUMN IF NOT EXISTS "is_correct" boolean;
--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ADD COLUMN IF NOT EXISTS "category" text;
--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ADD COLUMN IF NOT EXISTS "fallback_used" boolean;
--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ADD COLUMN IF NOT EXISTS "finish_reason" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_tutor_feedback" (
  "id" serial PRIMARY KEY NOT NULL,
  "message_id" integer NOT NULL REFERENCES "ai_tutor_messages"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "value" varchar(10) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ai_tutor_feedback_unique" UNIQUE ("message_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_feedback_user_idx" ON "ai_tutor_feedback" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_question_idx" ON "ai_tutor_messages" ("question_id");
