CREATE TABLE "style_component" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"image_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_gen_prompt" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "state" SET DEFAULT 'not_started';--> statement-breakpoint
CREATE UNIQUE INDEX "style_component_slug_index" ON "style_component" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "style_component_name_index" ON "style_component" USING btree ("name");