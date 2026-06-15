-- Add new current_levels column
ALTER TABLE "test_attempts" ADD COLUMN "current_levels" jsonb DEFAULT '{}'::jsonb;

-- Migrate existing current_level data to per-type levels JSONB
-- For in_progress attempts, convert the single level to all test types
UPDATE "test_attempts"
SET "current_levels" = jsonb_build_object(
  'focus-form', COALESCE("current_level", 'B1'),
  'focus-meaning', COALESCE("current_level", 'B1'),
  'form-meaning', COALESCE("current_level", 'B1'),
  'listening', COALESCE("current_level", 'B1')
)
WHERE "current_levels" = '{}'::jsonb AND "current_level" IS NOT NULL;

-- Drop old column
ALTER TABLE "test_attempts" DROP COLUMN IF EXISTS "current_level";