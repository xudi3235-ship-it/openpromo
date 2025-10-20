DROP INDEX "unified_content_id_workspace_id_connected_account_id_index";--> statement-breakpoint
CREATE UNIQUE INDEX "unified_content_workspace_id_connected_account_id_index" ON "unified_content" USING btree ("workspace_id","connected_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unified_content_source_content_id_index" ON "unified_content" USING btree ("source_content_id");