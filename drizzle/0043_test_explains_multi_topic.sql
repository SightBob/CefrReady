-- หนึ่งหน้าคำอธิบายเชื่อมกับข้อสอบได้หลายหัวข้อ (หลาย grammarTopic)
-- เพิ่มคอลัมน์ grammar_topics เก็บรายการหัวข้อทั้งหมด — ตัวแรกคือหัวข้อหลักตาม grammar_topic เดิม
ALTER TABLE test_explains ADD COLUMN grammar_topics jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ข้อมูลเดิม: หัวข้อเดียวตาม grammar_topic (trim ให้ตรงวิธีเทียบของหน้าสอบ)
UPDATE test_explains SET grammar_topics = JSONB_BUILD_ARRAY(TRIM(grammar_topic));
