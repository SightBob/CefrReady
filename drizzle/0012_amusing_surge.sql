BEGIN;

-- Deduplicate: keep the latest report per (question_id, user_id), delete older duplicates.
-- This must run BEFORE adding the UNIQUE constraint to avoid migration failure.
DELETE FROM question_reports
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY question_id, user_id ORDER BY created_at DESC) as rn
    FROM question_reports
    WHERE user_id IS NOT NULL
  ) t WHERE rn > 1
);

ALTER TABLE "question_reports" ADD CONSTRAINT "qr_user_question_unique" UNIQUE("question_id","user_id");

COMMIT;