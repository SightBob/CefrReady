-- 0048_ai_tutor_settings
--
-- ให้ผู้ดูแลปรับค่า AI Tutor ได้จากหน้า admin โดยไม่ต้องแก้ env / redeploy
--
-- 1) ai_tutor_settings — key/value (value เป็น jsonb) เก็บค่าที่ override ค่า env
--    (ค่า env เป็นค่าตั้งต้น — DB ทับได้เฉพาะค่าที่ตั้งในหน้า admin)
-- 2) ai_tutor_admin_audit — บันทึกว่าใครเปลี่ยนค่าอะไร จากอะไร เป็นอะไร
CREATE TABLE IF NOT EXISTS "ai_tutor_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE set null,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_tutor_admin_audit" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "action" varchar(50) NOT NULL,
  "target" varchar(200),
  "before" jsonb,
  "after" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_admin_audit_created_idx" ON "ai_tutor_admin_audit" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_tutor_admin_audit_actor_idx" ON "ai_tutor_admin_audit" ("actor_user_id");
