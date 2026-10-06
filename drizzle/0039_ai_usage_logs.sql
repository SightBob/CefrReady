-- AI Usage Logs: บันทึกการเรียก AI (OpenRouter) เพื่อดู token/request รายคนในหน้า admin
-- บันทึกแบบ fire-and-forget จาก /api/tests/tap-reason หลังเรียก evaluateTapReason
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
  "id" serial PRIMARY KEY,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "feature" varchar(50) NOT NULL,
  "model" varchar(200) NOT NULL,
  "prompt_tokens" integer NOT NULL,
  "completion_tokens" integer NOT NULL,
  "total_tokens" integer NOT NULL,
  "status" varchar(20) NOT NULL,
  "error_status" integer,
  "latency_ms" integer,
  "understanding" varchar(20),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_usage_logs_user_idx" ON "ai_usage_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_feature_idx" ON "ai_usage_logs" ("feature");
