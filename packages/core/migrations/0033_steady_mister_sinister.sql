CREATE TYPE "public"."style_component_state" AS ENUM('not_started', 'pending', 'processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "style_component" ADD COLUMN "state" "style_component_state" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "style_component" ADD COLUMN "failure_reason" text;