-- 0054_test_attempt_normalized_score_integer
-- 0053 สร้างคอลัมน์มาเป็น numeric (pg_typeof ยืนยันหน้างาน) แต่ schema ของ Drizzle
-- ประกาศเป็น integer และโค้ดอ่านค่าเป็น number → แปลงให้ตรงชนิดก่อนเริ่ม backfill
-- (คอลัมน์ยังว่างทั้งหมดตอนรัน จึงไม่มีข้อมูล丢失)

ALTER TABLE "test_attempts"
  ALTER COLUMN "normalized_score" TYPE integer USING "normalized_score"::integer;
