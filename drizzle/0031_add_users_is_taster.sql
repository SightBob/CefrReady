-- Add is_taster column: users with this role can browse the site while
-- maintenance mode is enabled (beta testers). Does not grant admin access.
ALTER TABLE "users" ADD COLUMN "is_taster" boolean DEFAULT false NOT NULL;
