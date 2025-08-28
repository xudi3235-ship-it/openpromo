CREATE TYPE "public"."placement" AS ENUM('IG_FEED', 'IG_STORY', 'IG_REEL', 'FB_FEED', 'FB_STORY', 'FB_REEL');--> statement-breakpoint
CREATE TYPE "public"."publishing_status" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED_TO_PUBLISH');--> statement-breakpoint
CREATE TABLE "connected_account" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"external_account_id" varchar(255) NOT NULL,
	"external_url" text NOT NULL,
	"account_name" varchar(255),
	"profile_pic_url" text,
	"encrypted_access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"metadata" json,
	CONSTRAINT "connected_account_workspaceId_external_account_id_unique" UNIQUE("workspace_id","external_account_id")
);
--> statement-breakpoint
CREATE TABLE "pending_content_group" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"base_spec" json
);
--> statement-breakpoint
CREATE TABLE "unified_content" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_account_id" "ulid" NOT NULL,
	"placement_spec" json,
	"placement" "placement" NOT NULL,
	"publishing_status" "publishing_status" NOT NULL,
	"schedule_name" varchar(255),
	"scheduled_publish_at" timestamp with time zone,
	"pending_content_group_id" "ulid",
	"published_at" timestamp with time zone,
	"thumbnail_url" text NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_account" ADD CONSTRAINT "connected_account_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_content_group" ADD CONSTRAINT "pending_content_group_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_content" ADD CONSTRAINT "unified_content_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_content" ADD CONSTRAINT "unified_content_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_content" ADD CONSTRAINT "unified_content_pending_content_group_id_pending_content_group_id_fk" FOREIGN KEY ("pending_content_group_id") REFERENCES "public"."pending_content_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_idx" ON "connected_account" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "workspace_platform_idx" ON "connected_account" USING btree ("workspace_id","platform");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_content_group_workspace_id_id_index" ON "pending_content_group" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "unified_content_id_workspace_id_connected_account_id_index" ON "unified_content" USING btree ("id","workspace_id","connected_account_id");