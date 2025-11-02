-- Custom SQL migration file, put your code below! --

-- Create the tiktok_auth_type enum
DO $$ BEGIN
 CREATE TYPE "public"."tiktok_auth_type" AS ENUM('DEVELOPER_OAUTH', 'BUSINESS_LOGIN', 'N/A');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add the tiktok_auth_type column with default 'N/A'
ALTER TABLE "connected_account" ADD COLUMN "tiktok_auth_type" "tiktok_auth_type" DEFAULT 'N/A' NOT NULL;
--> statement-breakpoint

-- Update existing TikTok accounts to DEVELOPER_OAUTH (all existing TikTok accounts use developer OAuth)
UPDATE "connected_account" 
SET "tiktok_auth_type" = 'DEVELOPER_OAUTH' 
WHERE "platform" = 'TIKTOK';
--> statement-breakpoint

-- Create index on tiktok_auth_type
CREATE INDEX IF NOT EXISTS "tiktok_auth_type_idx" ON "connected_account" USING btree ("tiktok_auth_type");
--> statement-breakpoint