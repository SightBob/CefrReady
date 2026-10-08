-- 0042: แยก "สถานะของเนื้อหา" ออกจาก "ตัวข้อมูล" ของ test_explains
--
--   draft     = กำลังพัฒนา (ผู้เรียนไม่เห็น)
--   review    = ตรวจเสร็จแล้ว กำลังตรวจสอบ (ผู้เรียนไม่เห็น)
--   published = พร้อมให้ผู้เรียนเห็น
--   hidden    = มีข้อมูลอยู่ แต่ปิดไม่ให้ผู้เรียนเห็นชั่วคราว (maintenance)
--
-- is_published เดิมถูกแทนที่ด้วย status (true → published, false → draft)
-- จึงเหลือแหล่งความจริงเดียวว่าเนื้อหาเรื่องไหนผู้เรียนเห็นได้
-- ส่วนระดับย่อยใช้ `sections[i].visibility = 'draft'` ในคอลัมน์ sections (JSONB)
-- ไม่ต้องเพิ่มคอลัมน์

ALTER TABLE test_explains
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'draft';

-- เนื้อหาที่เผยแพร่อยู่เดิมต้องไม่หายจากผู้เรียน
UPDATE test_explains SET status = 'published' WHERE is_published IS TRUE;

ALTER TABLE test_explains DROP COLUMN IF EXISTS is_published;
DROP INDEX IF EXISTS test_explains_published_idx;

CREATE INDEX IF NOT EXISTS test_explains_status_idx ON test_explains (status);

ALTER TABLE test_explains DROP CONSTRAINT IF EXISTS test_explains_status_check;
ALTER TABLE test_explains
  ADD CONSTRAINT test_explains_status_check
  CHECK (status IN ('draft', 'review', 'published', 'hidden'));
