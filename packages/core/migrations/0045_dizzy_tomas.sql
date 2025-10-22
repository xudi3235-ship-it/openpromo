CREATE TABLE "connected_account_metrics_snapshot" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"connected_account_id" "ulid" NOT NULL,
	"platform" "platform" NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"followers_count" integer,
	"following_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_account_metrics_snapshot" ADD CONSTRAINT "connected_account_metrics_snapshot_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_account_metrics_snapshot" ADD CONSTRAINT "connected_account_metrics_snapshot_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connected_account_metrics_snapshot_workspace_id_collected_at_index" ON "connected_account_metrics_snapshot" USING btree ("workspace_id","collected_at");--> statement-breakpoint
CREATE INDEX "connected_account_metrics_snapshot_connected_account_id_collected_at_index" ON "connected_account_metrics_snapshot" USING btree ("connected_account_id","collected_at");--> statement-breakpoint
CREATE INDEX "connected_account_metrics_snapshot_workspace_id_platform_collected_at_index" ON "connected_account_metrics_snapshot" USING btree ("workspace_id","platform","collected_at");