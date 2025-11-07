DO $$ BEGIN
 ALTER TYPE "public"."tiktok_auth_type" ADD VALUE IF NOT EXISTS 'ADVERTISER';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TYPE "public"."insight_event_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."insight_event_type" AS ENUM('goal_achieved', 'goal_at_risk', 'anomaly_detected', 'milestone_hit', 'custom');--> statement-breakpoint
CREATE TYPE "public"."workspace_goal_cadence" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."workspace_goal_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."workspace_goal_type" AS ENUM('publish_cadence', 'reach');--> statement-breakpoint
CREATE TABLE "insight_events" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" "insight_event_type" NOT NULL,
	"severity" "insight_event_severity" DEFAULT 'info' NOT NULL,
	"snapshot_id" "ulid",
	"goal_id" "ulid",
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_insight_snapshots" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_goal_progress" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"goal_id" "ulid" NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"actual_value" integer DEFAULT 0 NOT NULL,
	"target_value" integer DEFAULT 0 NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_goals" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"goal_type" "workspace_goal_type" NOT NULL,
	"status" "workspace_goal_status" DEFAULT 'active' NOT NULL,
	"cadence" "workspace_goal_cadence" DEFAULT 'weekly' NOT NULL,
	"target_value" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "insight_events" ADD CONSTRAINT "insight_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_events" ADD CONSTRAINT "insight_events_snapshot_id_workspace_insight_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."workspace_insight_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_events" ADD CONSTRAINT "insight_events_goal_id_workspace_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."workspace_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_insight_snapshots" ADD CONSTRAINT "workspace_insight_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_goal_progress" ADD CONSTRAINT "workspace_goal_progress_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_goal_progress" ADD CONSTRAINT "workspace_goal_progress_goal_id_workspace_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."workspace_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_goals" ADD CONSTRAINT "workspace_goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insight_events_workspace_id_event_type_created_at_index" ON "insight_events" USING btree ("workspace_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "insight_events_goal_id_index" ON "insight_events" USING btree ("goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_insight_snapshots_workspace_id_snapshot_date_index" ON "workspace_insight_snapshots" USING btree ("workspace_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "workspace_insight_snapshots_workspace_id_created_at_index" ON "workspace_insight_snapshots" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "workspace_goal_progress_workspace_id_goal_id_index" ON "workspace_goal_progress" USING btree ("workspace_id","goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_goal_progress_goal_id_window_start_window_end_index" ON "workspace_goal_progress" USING btree ("goal_id","window_start","window_end");--> statement-breakpoint
CREATE INDEX "workspace_goals_workspace_id_goal_type_status_index" ON "workspace_goals" USING btree ("workspace_id","goal_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_goals_workspace_id_goal_type_cadence_index" ON "workspace_goals" USING btree ("workspace_id","goal_type","cadence");--> statement-breakpoint
