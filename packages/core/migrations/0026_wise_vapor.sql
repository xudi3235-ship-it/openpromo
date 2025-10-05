CREATE TYPE "public"."sender" AS ENUM('user', 'self');--> statement-breakpoint
ALTER TABLE "inbox_conversations" DROP CONSTRAINT "inbox_conversations_connected_account_id_connected_account_id_fk";
--> statement-breakpoint
ALTER TABLE "inbox_messages" DROP CONSTRAINT "inbox_messages_sender_contact_id_inbox_contacts_id_fk";
--> statement-breakpoint
DROP INDEX "inbox_conversations_connected_account_id_index";--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD COLUMN "contact_id" "ulid";--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD COLUMN "sender" "sender" NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_contact_id_inbox_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."inbox_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_conversations_connected_account_id_contact_id_index" ON "inbox_conversations" USING btree ("connected_account_id","contact_id");--> statement-breakpoint
ALTER TABLE "inbox_conversations" DROP COLUMN "external_id";--> statement-breakpoint
ALTER TABLE "inbox_conversations" DROP COLUMN "unread_count";--> statement-breakpoint
ALTER TABLE "inbox_messages" DROP COLUMN "sender_contact_id";--> statement-breakpoint
DROP TYPE "public"."message_type";