CREATE TABLE "learning_node_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"node_id" integer NOT NULL,
	"completed_at" timestamp,
	"last_visited_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_node_progress" ADD CONSTRAINT "learning_node_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "learning_node_progress" ADD CONSTRAINT "learning_node_progress_node_id_learning_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."learning_nodes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "learning_node_progress_user_idx" ON "learning_node_progress" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "learning_node_progress_node_idx" ON "learning_node_progress" USING btree ("node_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "learning_node_progress_user_node_unique" ON "learning_node_progress" USING btree ("user_id","node_id");
