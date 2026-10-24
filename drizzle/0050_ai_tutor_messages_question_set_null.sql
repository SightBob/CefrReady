-- 0050_ai_tutor_messages_question_set_null
--
-- เก็บสถิติบทสนทนา AI Tutor ไว้แม้ข้อสอบถูกลบ
--
-- ปัญหาเดิม: ai_tutor_messages.question_id → questions(id) ON DELETE CASCADE
--   → ลบข้อสอบทิ้ง = ข้อความ/คำตอบของผู้เรียนหายตามไป (สถิติ + ข้อมูลวิเคราะห์หาย)
--
-- วิธีแก้: เปลี่ยนเป็น ON DELETE SET NULL + คอลัมน์ nullable
--   → ข้อความยังอยู่ (นับโควตา/นับทั้งระบบได้เหมือนเดิม) แต่ไม่ผูกกับข้อสอบแล้ว
--   → เธรดที่แสดงต่อผู้เรียน (user + question + attempt_key) จะไม่เห็นแถวนี้
--      (ข้อสอบถูกลบไปแล้ว ไม่มีเหตุผลที่จะต้องเห็น) — เหมือนเดิมกับกรณีไม่มีแถว
--
-- ชื่อ constraint จริง (อ่านจาก pg_constraint ของฐานข้อมูล):
--   ai_tutor_messages_question_id_fkey → FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
--
-- หมายเหตุ: ทั้ง 3 statement รันใน transaction ได้ (ไม่ต้อง CONCURRENTLY)
--   → เข้ากับ scripts/apply-migration.ts ที่รันแต่ละไฟล์ใน transaction
ALTER TABLE "ai_tutor_messages" DROP CONSTRAINT IF EXISTS "ai_tutor_messages_question_id_fkey";
--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ALTER COLUMN "question_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_tutor_messages" ADD CONSTRAINT "ai_tutor_messages_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"(id) ON DELETE SET NULL;
--> statement-breakpoint
-- index สำหรับเพดานรวมทั้งระบบ/วัน (นับแถว role='user' ตั้งแต่เที่ยงคืนเวลาไทย)
--   เดิม query นี้เป็น Seq Scan เพราะ index ทุกตัวเริ่มด้วย user_id/question_id
--   → partial index เล็กกว่าตารางเต็มมาก และใช้กับ query นี้โดยเฉพาะ
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_system_day_idx" ON "ai_tutor_messages" ("created_at") WHERE "role" = 'user';
