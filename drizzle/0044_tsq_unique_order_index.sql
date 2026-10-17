-- 0044_tsq_unique_order_index
--
-- แก้ orderIndex ซ้ำใน test_set_questions + บังคับ unique ต่อไป
--
-- ที่มา: import route เคยคำนวณ orderIndex จาก COUNT(*) ที่รันก่อน bulk insert
-- → ทุกแถวที่ import เข้าชุดเดียวกันได้ orderIndex เท่ากันหมด (ลำดับข้อผิด)
-- โค้ดแก้แล้วใน allocateOrderIndex() — migration นี้คือการซ่อมข้อมูลเก่า
--
-- ⚠️ ต้องรันส่วนที่ 1 ก่อนส่วนที่ 2 เสมอ
--    ถ้ารันส่วน 2 ก่อน CREATE UNIQUE INDEX จะ fail ด้วย
--    "could not create unique index ... duplicate key value"
--
-- ตรวจข้อมูลซ้ำก่อนรัน (ปลอดภัย อ่านอย่างเดียว):
--
--   SELECT test_set_id, order_index, count(*)
--   FROM test_set_questions
--   GROUP BY test_set_id, order_index
--   HAVING count(*) > 1
--   ORDER BY test_set_id, order_index;

-- ── ส่วนที่ 1: ซ่อม orderIndex ที่ซ้ำ ──────────────────────────────────────
-- เรียงตาม order_index เดิมก่อน (รักษาลำดับที่ตั้งใจไว้) แล้ว tie-break ด้วย id
-- แล้วเขียนค่ากลับเป็น 0,1,2,... เรียงต่อกันไม่ซ้ำภายในชุดเดียวกัน
WITH renumbered AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY test_set_id
      ORDER BY order_index ASC, id ASC
    ) - 1 AS new_order_index
  FROM test_set_questions
)
UPDATE test_set_questions AS t
SET order_index = r.new_order_index
FROM renumbered AS r
WHERE t.id = r.id
  AND t.order_index IS DISTINCT FROM r.new_order_index;

-- ── ส่วนที่ 2: บังคับ unique ต่อจากนั้น ────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS tsq_set_order_unique
  ON test_set_questions (test_set_id, order_index);