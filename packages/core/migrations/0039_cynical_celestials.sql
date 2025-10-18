CREATE TABLE "content_metrics_snapshot" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"content_id" "ulid" NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granularity" text DEFAULT 'daily' NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unified_content" ADD COLUMN "metrics_refreshed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_metrics_snapshot" ADD CONSTRAINT "content_metrics_snapshot_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_metrics_snapshot" ADD CONSTRAINT "content_metrics_snapshot_content_id_unified_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."unified_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_metrics_snapshot_workspace_id_content_id_collected_at_index" ON "content_metrics_snapshot" USING btree ("workspace_id","content_id","collected_at");--> statement-breakpoint
CREATE INDEX "content_metrics_snapshot_workspace_id_granularity_collected_at_index" ON "content_metrics_snapshot" USING btree ("workspace_id","granularity","collected_at");--> statement-breakpoint
ALTER TABLE "unified_content" ADD CONSTRAINT "unified_content_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE no action ON UPDATE no action;