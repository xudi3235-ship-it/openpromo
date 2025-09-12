ALTER TABLE "connected_account" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "connected_account" ALTER COLUMN "metadata" SET NOT NULL;