CREATE TABLE IF NOT EXISTS "vocabularies" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(100) NOT NULL,
	"phonetic" varchar(100),
	"part_of_speech" varchar(30),
	"definition" text NOT NULL,
	"example" text,
	"thai_meaning" varchar(200) NOT NULL,
	"cefr_level" varchar(5) NOT NULL,
	"topic" varchar(100),
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vocabularies_word_idx" ON "vocabularies" USING btree ("word");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vocabularies_level_idx" ON "vocabularies" USING btree ("cefr_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vocabularies_topic_idx" ON "vocabularies" USING btree ("topic");