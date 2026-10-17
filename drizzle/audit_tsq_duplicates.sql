-- Read-only: ตรวจว่า test_set_questions มีคู่ (test_set_id, question_id) ซ้ำไหม
-- ปลอดภัย อ่านอย่างเดียว ไม่แก้ข้อมูล ไม่ล็อกตารางแบบเขียน
--
-- บริบท: src/db/schema.ts ประกาศ index ชื่อ 'tsq_unique' บน (test_set_id, question_id)
-- แต่เรียกด้วย index() ไม่ใช่ uniqueIndex() → ใน DB เป็น plain index ชื่อหลอก
-- คุ้มกันจริงตอนนี้คือ if (!existing) ในโค้ดเท่านั้น
-- scripts/migrate-test-sets.ts:54 สร้างด้วย CREATE UNIQUE INDEX จริง
-- → ตารางอาจถูกบังคับ unique แล้ว ขึ้นกับว่ารันสคริปต์ไหนไปก่อน

-- 1) คู่ซ้ำที่มีอยู่ (ข้อมูลที่ unique index จะปฏิเสธ)
SELECT
  test_set_id,
  question_id,
  count(*)              AS dup_count,
  min(id)               AS first_assignment_id,
  max(id)               AS last_assignment_id,
  array_agg(order_index ORDER BY id) AS order_indexes
FROM test_set_questions
GROUP BY test_set_id, question_id
HAVING count(*) > 1
ORDER BY dup_count DESC, test_set_id, question_id;

-- 2) สรุปจำนวน (ต้องได้ 0 แถวถ้าไม่มีซ้ำ)
SELECT
  count(*)                       AS total_rows,
  count(DISTINCT (test_set_id, question_id)) AS distinct_pairs,
  count(*) - count(DISTINCT (test_set_id, question_id)) AS duplicate_pairs
FROM test_set_questions;

-- 3) index ที่มีอยู่จริงบนตาราง (ดูว่าอันไหนถูกบังคับ unique)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'test_set_questions'
ORDER BY indexname;

-- 4) constraint ระดับตาราง (ไม่รวม FK / PK ปกติ)
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'test_set_questions'::regclass
  AND contype IN ('u', 'p')
ORDER BY conname;

-- 5) เช็คว่าชุดไหนมี order_index ซ้ำ (ข้อมูลที่ migration 0044 ส่วน 1 จะซ่อม)
SELECT test_set_id, order_index, count(*)
FROM test_set_questions
GROUP BY test_set_id, order_index
HAVING count(*) > 1
ORDER BY test_set_id, order_index;

-- 6) ชุดที่มีช่องว่างใน order_index (count() ใช้เป็น orderIndex ถัดไปไม่ได้
--    ตอนนี้โค้ดใช้ max()+1 แล้ว แต่ข้อมูลเก่าอาจยังมี)
SELECT test_set_id, count(*) AS rows_in_set, min(order_index) AS min_oi,
       max(order_index) AS max_oi,
       (max(order_index) + 1) AS expected_next
FROM test_set_questions
GROUP BY test_set_id
HAVING max(order_index) + 1 <> count(*)
ORDER BY test_set_id;