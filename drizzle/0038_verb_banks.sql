CREATE TABLE IF NOT EXISTS "verb_banks" (
  "id" serial PRIMARY KEY,
  "v1" varchar(100) NOT NULL,
  "v2" varchar(100) NOT NULL,
  "v3" varchar(100) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "verb_banks_v1_idx" ON "verb_banks" ("v1");

-- ย้ายข้อมูลตัวอย่างเดิมที่ hardcode ไว้ใน TestLayout.tsx เข้ามาในตาราง
-- (ON CONFLICT ต้องพึ่ง unique index จึงเพิ่มใน migration นี้ด้วย)
CREATE UNIQUE INDEX IF NOT EXISTS "verb_banks_v1_v2_v3_uniq" ON "verb_banks" ("v1", "v2", "v3");

INSERT INTO "verb_banks" ("v1", "v2", "v3")
VALUES
  ('go', 'went', 'gone'),
  ('eat', 'ate', 'eaten'),
  ('see', 'saw', 'seen')
ON CONFLICT ("v1", "v2", "v3") DO NOTHING;