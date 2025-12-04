CREATE TYPE "public"."agent_run_agent" AS ENUM('video_gen_agent', 'image_gen_agent');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('not_started', 'running', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."asset_link_entity" AS ENUM('product', 'style', 'agent_run', 'user', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."asset_link_role" AS ENUM('style_reference', 'avatar', 'brand_asset', 'product_source', 'cover', 'generated_output', 'artifact', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."asset_storage_provider" AS ENUM('r2', 's3', 'http');--> statement-breakpoint
CREATE TABLE "agent_run" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"agent_name" "agent_run_agent" NOT NULL,
	"status" "agent_run_status" DEFAULT 'not_started' NOT NULL,
	"input" jsonb DEFAULT '{"prompt":"empty prompt","productImages":[],"avatarImages":[],"referenceImages":[],"brandAssets":[]}'::jsonb NOT NULL,
	"artifacts" jsonb DEFAULT '{"images":[],"videos":[]}'::jsonb NOT NULL,
	"output" jsonb DEFAULT '{"done":false,"message":"","output":{"images":[],"videos":[]},"error":null}'::jsonb NOT NULL,
	"logs" text,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_link" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"asset_id" "ulid" NOT NULL,
	"entity_type" "asset_link_entity" NOT NULL,
	"entity_id" "ulid" NOT NULL,
	"role" "asset_link_role" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"type" "asset_type" NOT NULL,
	"storage_provider" "asset_storage_provider" DEFAULT 'http' NOT NULL,
	"bucket" text,
	"object_key" text,
	"url" text NOT NULL,
	"mime_type" text,
	"width" text,
	"height" text,
	"hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_link" ADD CONSTRAINT "asset_link_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_link" ADD CONSTRAINT "asset_link_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_run_id_index" ON "agent_run" USING btree ("id");--> statement-breakpoint
CREATE INDEX "agent_run_created_at_index" ON "agent_run" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_link_id_index" ON "asset_link" USING btree ("id");--> statement-breakpoint
CREATE INDEX "asset_link_workspace_id_index" ON "asset_link" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "asset_link_asset_id_index" ON "asset_link" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_link_entity_type_entity_id_index" ON "asset_link" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "asset_link_role_index" ON "asset_link" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_id_index" ON "asset" USING btree ("id");--> statement-breakpoint
CREATE INDEX "asset_workspace_id_index" ON "asset" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "asset_type_index" ON "asset" USING btree ("type");--> statement-breakpoint
CREATE INDEX "asset_hash_index" ON "asset" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "asset_storage_provider_index" ON "asset" USING btree ("storage_provider");--> statement-breakpoint
CREATE INDEX "asset_bucket_index" ON "asset" USING btree ("bucket");--> statement-breakpoint
CREATE INDEX "asset_object_key_index" ON "asset" USING btree ("object_key");