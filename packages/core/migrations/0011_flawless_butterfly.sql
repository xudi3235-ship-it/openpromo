CREATE TABLE "connected_account" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"external_account_id" varchar(255) NOT NULL,
	"external_url" text NOT NULL,
	"account_name" varchar(255),
	"encrypted_access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"metadata" json
);
--> statement-breakpoint
ALTER TABLE "connected_account" ADD CONSTRAINT "connected_account_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_idx" ON "connected_account" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "workspace_platform_idx" ON "connected_account" USING btree ("workspace_id","platform");