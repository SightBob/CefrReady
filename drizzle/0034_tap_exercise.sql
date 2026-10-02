ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "tap_exercise" jsonb;
