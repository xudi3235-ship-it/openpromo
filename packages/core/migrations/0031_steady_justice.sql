CREATE TABLE "image_generation" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"style_component_id" "ulid" NOT NULL,
	"product_id" "ulid",
	"prompt" text NOT NULL,
	"negative_prompt" text,
	"output_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_generation" ADD CONSTRAINT "image_generation_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generation" ADD CONSTRAINT "image_generation_style_component_id_style_component_id_fk" FOREIGN KEY ("style_component_id") REFERENCES "public"."style_component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generation" ADD CONSTRAINT "image_generation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "image_generation_id_index" ON "image_generation" USING btree ("id");--> statement-breakpoint
CREATE INDEX "image_generation_created_at_index" ON "image_generation" USING btree ("created_at");