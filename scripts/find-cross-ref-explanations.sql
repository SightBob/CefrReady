-- ============================================================
-- Find questions whose explanations cross-reference other questions
-- Run this in Drizzle Studio or any PostgreSQL client
-- ============================================================

SELECT
  q.id,
  q.test_type_id,
  q.question_text,
  q.explanation
FROM questions q
WHERE q.explanation IS NOT NULL
  AND (
    -- Thai patterns
    q.explanation ILIKE '%ข้อก่อนหน้า%'
    OR q.explanation ILIKE '%ข้อที่ผ่านมา%'
    OR q.explanation ILIKE '%ข้อที่แล้ว%'
    OR q.explanation ILIKE '%ข้อก่อน%'
    OR q.explanation ILIKE '%ข้อต่อไป%'
    OR q.explanation ILIKE '%ดังนั้นจากข้อ%'
    OR q.explanation ILIKE '%เช่นเดียวกับข้อ%'
    OR q.explanation ILIKE '%ต่างจากข้อ%'
    OR q.explanation ILIKE '%คล้ายกับข้อ%'
    OR q.explanation ILIKE '%จากข้อที่%'
    OR q.explanation ILIKE '%ในข้อที่%'
    OR q.explanation ILIKE '%อีกในข้อ%'
    OR q.explanation ILIKE '%ข้อนี้เหมือน%'
    OR q.explanation ILIKE '%ข้อที่เกี่ยวข้อง%'

    -- English patterns
    OR q.explanation ILIKE '%previous question%'
    OR q.explanation ILIKE '%previous item%'
    OR q.explanation ILIKE '%as above%'
    OR q.explanation ILIKE '%as discussed%'
    OR q.explanation ILIKE '%as mentioned%'
    OR q.explanation ILIKE '%as seen%'
    OR q.explanation ILIKE '%in the previous%'
    OR q.explanation ILIKE '%see above%'
    OR q.explanation ILIKE '%see question%'
    OR q.explanation ILIKE '%like the previous%'
    OR q.explanation ILIKE '%similar to%'
    OR q.explanation ILIKE '%unlike the%'
    OR q.explanation ILIKE '%contrast with%'
    OR q.explanation ILIKE '%from the last%'
    OR q.explanation ILIKE '%from question%'
    OR q.explanation ILIKE '%in question%'
  )
ORDER BY q.test_type_id, q.id;
