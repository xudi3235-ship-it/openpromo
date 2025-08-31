ALTER TABLE "pending_content_group" ADD COLUMN "publishing_status" "publishing_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "unified_content" ADD COLUMN "scheduling_spec" jsonb;