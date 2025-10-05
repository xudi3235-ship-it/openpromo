CREATE TYPE "public"."product_source" AS ENUM('MANUAL', 'AMAZON', 'SHOPIFY', 'ETSY', 'CUSTOM_URL');--> statement-breakpoint
CREATE TABLE "product" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"source" "product_source" DEFAULT 'MANUAL' NOT NULL,
	"source_url" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"primary_attachment_id" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_id_workspace_id_index" ON "product" USING btree ("id","workspace_id");