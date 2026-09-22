-- Immutable version history for admin-managed lesson pages.
CREATE TABLE IF NOT EXISTS "lesson_page_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "page_id" integer NOT NULL REFERENCES "lesson_pages"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "change_type" varchar(20) DEFAULT 'update' NOT NULL,
  "changed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lesson_page_versions_page_idx" ON "lesson_page_versions" ("page_id", "version");
CREATE INDEX IF NOT EXISTS "lesson_page_versions_created_at_idx" ON "lesson_page_versions" ("created_at");
