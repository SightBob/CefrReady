-- 0045_ai_tutor_access
--
-- เพิ่มสิทธิ์เห็นฟีเจอร์ AI Tutor เฉพาะบัญชี (Figma 580:27829)
--
-- หมายเหตุ: เปิดให้บัญชีใดบัญชีหนึ่ง เฉพาะที่ env AI_TUTOR_ENABLED ปิดทุกอย่างไว้
-- ค่า default false จึงส่งผล "ไม่มีใครเห็น" แม้รัน migration แล้ว
-- การเปิดให้บัญชีเฉพาะราย: npx tsx scripts/ai-tutor-access.ts grant <email>
ALTER TABLE "users" ADD COLUMN "ai_tutor_access" boolean DEFAULT false NOT NULL;
