CREATE TYPE "public"."product_state" AS ENUM('not_started', 'pending', 'processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "tags" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "attachments" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "state" "product_state" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "state_message" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "workflow_instance_id" text;