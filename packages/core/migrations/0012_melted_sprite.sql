ALTER TABLE "pending_content_group" RENAME COLUMN "base_spec" TO "pending_content_group_spec";--> statement-breakpoint
ALTER TABLE "unified_content" DROP CONSTRAINT "unified_content_connected_account_id_connected_account_id_fk";
--> statement-breakpoint
ALTER TABLE "unified_content" ALTER COLUMN "placement_spec" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "unified_content" ADD COLUMN "source_content_id" "ulid";--> statement-breakpoint
ALTER TABLE "unified_content" DROP COLUMN "schedule_name";--> statement-breakpoint
ALTER TABLE "unified_content" DROP COLUMN "scheduled_publish_at";--> statement-breakpoint
ALTER TABLE "unified_content" DROP COLUMN "published_at";--> statement-breakpoint
ALTER TABLE "unified_content" DROP COLUMN "thumbnail_url";--> statement-breakpoint
ALTER TABLE "unified_content" DROP COLUMN "title";