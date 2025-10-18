CREATE TYPE "public"."inbox_channel" AS ENUM('dm', 'post_comment');--> statement-breakpoint
CREATE TYPE "public"."inbox_message_status" AS ENUM('open', 'snoozed', 'resolved');--> statement-breakpoint
CREATE TABLE "inbox_message_state" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"workspace_id" "ulid" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_id" "ulid" NOT NULL,
	"status" "inbox_message_status" DEFAULT 'open' NOT NULL,
	"assignee_id" text,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unified_content" DROP CONSTRAINT "unified_content_connected_account_id_connected_account_id_fk";
--> statement-breakpoint
DROP INDEX "inbox_conversations_connected_account_id_contact_id_index";--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD COLUMN "channel" "inbox_channel" DEFAULT 'dm' NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD COLUMN "thread_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD COLUMN "external_thread_id" text;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD COLUMN "content_id" "ulid";--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD COLUMN "channel" "inbox_channel" DEFAULT 'dm' NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD COLUMN "content_id" "ulid";--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_message_state" ADD CONSTRAINT "inbox_message_state_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_message_state" ADD CONSTRAINT "inbox_message_state_message_id_inbox_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."inbox_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_message_state_workspace_id_message_id_index" ON "inbox_message_state" USING btree ("workspace_id","message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_message_state_message_id_index" ON "inbox_message_state" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "unified_content" ADD CONSTRAINT "unified_content_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_content_id_unified_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."unified_content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_content_id_unified_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."unified_content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_conversations_connected_account_id_channel_thread_key_index" ON "inbox_conversations" USING btree ("connected_account_id","channel","thread_key");--> statement-breakpoint
CREATE INDEX "inbox_conversations_content_id_index" ON "inbox_conversations" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_conversations_connected_account_id_contact_id_index" ON "inbox_conversations" USING btree ("connected_account_id","contact_id") WHERE "inbox_conversations"."channel" = 'dm'::inbox_channel;