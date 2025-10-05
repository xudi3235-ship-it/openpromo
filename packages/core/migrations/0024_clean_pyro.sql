ALTER TABLE "inbox_messages" ADD COLUMN "attachments" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_messages" DROP COLUMN "message_type";--> statement-breakpoint
ALTER TABLE "inbox_messages" DROP COLUMN "media_url";