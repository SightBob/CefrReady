-- 0049_ai_tutor_attempt_key
--
-- แยกบทสนทนา AI Tutor ตาม "รอบการทำข้อสอบ" (attempt)
--
-- ปัญหาเดิม: เธรดของ AI Tutor ผูกกับ (user, question) เท่านั้น → ผู้เรียนทำชุดเดิมซ้ำ
-- (หรือกด "ทำซ้ำ") แล้วรีเฟรชหน้า จะเห็นบทสนทนาเก่าของรอบก่อนหน้าปนอยู่
--
-- วิธีแก้: เพิ่มคอลัมน์ attempt_key (text, nullable)
--   - ฝั่ง client สร้าง UUID ต่อรอบการทำข้อสอบ เก็บใน sessionStorage (ผูกกับชุดข้อสอบ)
--     และสร้างใหม่เมื่อเริ่มรอบใหม่ (เริ่มชุดใหม่ / หลังส่งข้อสอบ / กดทำซ้ำ)
--   - โหลดเธรดและส่งประวัติให้โมเดล เฉพาะ (user, question, attempt_key)
--   - แถวเดิมที่ attempt_key เป็น null จะไม่แสดงในเธรด (ข้อมูลยังอยู่ใน DB เพื่อวิเคราะห์)
--
-- โควตาไม่เปลี่ยน: ยังนับต่อ (user, question) ต่อวันตามเวลาไทยเท่าเดิม
-- (ถ้านับต่อ attempt_key ผู้เรียนจะเปลี่ยน key เพื่อเลี่ยงโควตาได้)
ALTER TABLE "ai_tutor_messages" ADD COLUMN IF NOT EXISTS "attempt_key" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_attempt_idx" ON "ai_tutor_messages" ("user_id","question_id","attempt_key","created_at");
