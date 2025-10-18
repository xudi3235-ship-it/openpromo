ALTER TABLE "inbox_conversations" DROP CONSTRAINT "inbox_conversations_connected_account_id_connected_account_id_fk";
--> statement-breakpoint
ALTER TABLE "inbox_conversations" DROP CONSTRAINT "inbox_conversations_contact_id_inbox_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_connected_account_id_connected_account_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_conversations" ADD CONSTRAINT "inbox_conversations_contact_id_inbox_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."inbox_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_account" ADD CONSTRAINT "connected_account_external_account_id_unique" UNIQUE("external_account_id");--> statement-breakpoint
ALTER TABLE "connected_account" ADD CONSTRAINT "connected_account_platform_external_account_id_unique" UNIQUE("platform","external_account_id");