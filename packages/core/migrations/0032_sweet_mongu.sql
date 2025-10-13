CREATE TYPE "public"."image_generation_state" AS ENUM('not_started', 'pending', 'generating', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "image_generation" DROP CONSTRAINT "image_generation_style_component_id_style_component_id_fk";
--> statement-breakpoint
ALTER TABLE "image_generation" ALTER COLUMN "style_component_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "image_generation" ALTER COLUMN "context" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "image_generation" ALTER COLUMN "context" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "image_generation" ADD COLUMN "state" "image_generation_state" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "image_generation" ADD COLUMN "state_message" text;--> statement-breakpoint
ALTER TABLE "image_generation" ADD COLUMN "workflow_instance_id" text;--> statement-breakpoint
ALTER TABLE "image_generation" ADD CONSTRAINT "image_generation_style_component_id_style_component_id_fk" FOREIGN KEY ("style_component_id") REFERENCES "public"."style_component"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generation" DROP COLUMN "prompt";--> statement-breakpoint
ALTER TABLE "image_generation" DROP COLUMN "negative_prompt";