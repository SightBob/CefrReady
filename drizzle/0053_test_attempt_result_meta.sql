-- 0053_test_attempt_result_meta
-- เก็บผลลัพธ์ที่คำนวณตอนส่ง Full Test: คะแนนถ่วงน้ำหนัก (0-120) และระดับ CEFR
-- เดิมหน้าผลสอบคำนวณใหม่ทุกครั้ง แต่ /progress ประมาณระดับจากเปอร์เซ็นต์คำตอบ
-- ทำให้ผลเดียวกันแสดง A1 ที่ /progress แต่ A2 ที่หน้าผลสอบ
-- (เพิ่มอย่างเดียว · ไม่แตะข้อมูลเดิม · ค่า NULL = แถวเก่าที่ยังไม่ backfill)

ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "normalized_score" integer;
ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "cefr_level" varchar(8);
