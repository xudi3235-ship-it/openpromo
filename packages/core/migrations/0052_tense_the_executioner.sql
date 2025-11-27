CREATE TYPE "public"."video_generation_state" AS ENUM('not_started', 'pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "video_generation" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"style_component_id" "ulid",
	"product_id" "ulid",
	"output_video_url" text,
	"metadata" jsonb NOT NULL,
	"state" "video_generation_state" DEFAULT 'not_started' NOT NULL,
	"state_message" text,
	"workflow_instance_id" text
);
--> statement-breakpoint
ALTER TABLE "video_generation" ADD CONSTRAINT "video_generation_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_generation" ADD CONSTRAINT "video_generation_style_component_id_style_component_id_fk" FOREIGN KEY ("style_component_id") REFERENCES "public"."style_component"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_generation" ADD CONSTRAINT "video_generation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "video_generation_id_index" ON "video_generation" USING btree ("id");--> statement-breakpoint
CREATE INDEX "video_generation_created_at_index" ON "video_generation" USING btree ("created_at");