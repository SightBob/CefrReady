-- 0046_ai_tutor_messages
--
-- บทสนทนา AI Tutor (โหมด AI ในหน้าทำข้อสอบ — Figma 580:27829)
--
-- เก็บเฉพาะข้อความที่ "เรียกโมเดลจริง" เท่านั้น
-- เทิร์นแรกของแต่ละข้อ (คำอธิบายเดิมจาก questions.explanation) ไม่เก็บในตารางนี้
-- เพราะดึงสดจาก DB ทุกครั้ง — ลด token และไม่มีทางคำอธิบายเพี้ยนจากต้นฉบับ
--
-- role:   'user' = คำถามของผู้เรียน (1 แถว = 1 การเรียกโมเดล ใช้นับโควตา)
--         'assistant' = คำตอบของโมเดล
-- status: 'pending' = จองโควตาแล้วกำลังเรียกโมเดล
--         'ok' = สำเร็จ (นับโควตา)
--         'failed' = ล้มเหลวก่อนมีเนื้อหา (ไม่นับโควตา = คืนโควตา)
-- archived: true = ถูกเก็บถัง (ปุ่ม reset) — ไม่ลบ และไม่คืนโควตา
CREATE TABLE IF NOT EXISTS "ai_tutor_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "question_id" integer NOT NULL REFERENCES "questions"("id") ON DELETE cascade,
  "role" varchar(20) NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "latency_ms" integer,
  "input_tokens" integer,
  "output_tokens" integer,
  "model" varchar(200)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_thread_idx" ON "ai_tutor_messages" ("user_id","question_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_messages_quota_idx" ON "ai_tutor_messages" ("user_id","question_id","status");
