-- 0052_test_attempt_drafts
--
-- เก็บความคืบหน้าการทำชุดข้อสอบที่ **ยังไม่กดส่ง** ไว้ในฐานข้อมูล
-- เพื่อให้เปิดแท็บใหม่/เปลี่ยนเครื่องแล้วทำต่อได้ (เดิมเก็บแค่ sessionStorage
-- → เปิดแท็บใหม่ความคืบหน้าหายทั้งหมด ดู src/lib/test-progress.ts)
--
-- ดีไซน์: ใช้ตาราง test_attempts เดิม ไม่สร้างตารางใหม่
--   - status = 'in_progress' + draft_state ไม่ NULL = มีรอบที่กำลังทำ
--   - /progress และรายงานของผู้เรียนกรอง status='completed' อยู่แล้ว → draft ไม่รบกวนสถิติ
--   - เมื่อส่งสำเร็จ ระบบจะปิด draft (status='completed' เกิดจาก submit แล้ว
--     และ draft_state ถูกตั้งเป็น NULL ใน transaction เดียวกัน)
--   - ปลอดภัยกับการย้อนกลับ: DROP COLUMN draft_state
--
-- ทั้งสองคำสั่งเป็นแบบ "เพิ่มอย่างเดียว" และ idempotent (IF NOT EXISTS)
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "draft_state" jsonb;

-- หนึ่งรอบที่กำลังทำต่อ (ผู้ใช้, พาร์ท, ชุด) — กันเขียนซ้ำซ้อนจากหลายแท็บ
CREATE UNIQUE INDEX IF NOT EXISTS "test_attempts_draft_unique"
  ON "test_attempts" ("user_id", "test_type_id", "test_set_id")
  WHERE "status" = 'in_progress' AND "draft_state" IS NOT NULL;
