CREATE INDEX "inbox_contacts_name_index" ON "inbox_contacts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "inbox_conversations_connected_account_id_last_message_at_index" ON "inbox_conversations" USING btree ("connected_account_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_conversations_connected_account_id_channel_last_message_at_index" ON "inbox_conversations" USING btree ("connected_account_id","channel","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_conversations_platform_connected_account_id_last_message_at_index" ON "inbox_conversations" USING btree ("platform","connected_account_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_messages_inbox_conversation_id_created_at_index" ON "inbox_messages" USING btree ("inbox_conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_messages_inbox_conversation_id_sender_index" ON "inbox_messages" USING btree ("inbox_conversation_id","sender");--> statement-breakpoint
CREATE INDEX "inbox_messages_content_id_index" ON "inbox_messages" USING btree ("content_id");