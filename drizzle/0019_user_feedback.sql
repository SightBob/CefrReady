BEGIN;

ALTER TABLE "contact_messages" ADD COLUMN "user_id" text;

ALTER TABLE "contact_messages" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "contact_messages" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "contact_messages" ALTER COLUMN "subject" DROP NOT NULL;

ALTER TABLE "contact_messages"
  ADD CONSTRAINT "contact_messages_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "contact_messages_user_idx" ON "contact_messages" USING btree ("user_id");

COMMIT;
