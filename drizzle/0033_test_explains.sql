CREATE TABLE IF NOT EXISTS "test_explains" (
  "id" serial PRIMARY KEY NOT NULL,
  "grammar_topic" varchar(200) NOT NULL UNIQUE,
  "title" varchar(200) NOT NULL,
  "intro" text,
  "sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tip" text,
  "is_published" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "test_explains_published_idx" ON "test_explains" ("is_published");
