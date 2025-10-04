CREATE TYPE "public"."platform" AS ENUM('FACEBOOK', 'INSTAGRAM', 'TIKTOK');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'video', 'audio', 'file', 'reel', 'ig_reel');--> statement-breakpoint
CREATE TABLE "inbox_contacts" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" "platform" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"profile_pic_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_conversations" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_account_id" "ulid",
	"external_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"inbox_conversation_id" "ulid",
	"external_id" text NOT NULL,
	"sender_contact_id" "ulid",
	"message_type" "message_type" NOT NULL,
	"text" text,
	"media_url" text,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_account" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_inbox_conversation_id_inbox_conversations_id_fk" FOREIGN KEY ("inbox_conversation_id") REFERENCES "public"."inbox_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_sender_contact_id_inbox_contacts_id_fk" FOREIGN KEY ("sender_contact_id") REFERENCES "public"."inbox_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_contacts_platform_external_id_index" ON "inbox_contacts" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "inbox_conversations_connected_account_id_index" ON "inbox_conversations" USING btree ("connected_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_messages_inbox_conversation_id_external_id_index" ON "inbox_messages" USING btree ("inbox_conversation_id","external_id");