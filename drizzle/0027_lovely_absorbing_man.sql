CREATE TABLE "learning_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"kind" varchar(20) DEFAULT 'star' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(200),
	"color_key" varchar(20) DEFAULT 'green' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" integer NOT NULL,
	"page_type" varchar(20) DEFAULT 'explain' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb,
	"quiz" jsonb,
	"vocab_bank" jsonb,
	"tip" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_unit_id_learning_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."learning_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_pages" ADD CONSTRAINT "lesson_pages_node_id_learning_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."learning_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_nodes_unit_idx" ON "learning_nodes" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "learning_nodes_order_idx" ON "learning_nodes" USING btree ("unit_id","order_index");--> statement-breakpoint
CREATE INDEX "learning_units_order_idx" ON "learning_units" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "learning_units_published_idx" ON "learning_units" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "lesson_pages_node_idx" ON "lesson_pages" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "lesson_pages_order_idx" ON "lesson_pages" USING btree ("node_id","order_index");