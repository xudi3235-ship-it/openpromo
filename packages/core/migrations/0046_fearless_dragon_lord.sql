ALTER TABLE "connected_account" ADD COLUMN "followers_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "connected_account" ADD COLUMN "following_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "connected_account" ADD COLUMN "metrics_refreshed_at" timestamp with time zone;