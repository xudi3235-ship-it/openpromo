DROP INDEX "workspace_role_assignments_workspace_id_assignee_id_index";--> statement-breakpoint
DROP INDEX "workspaces_organization_id_index";--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_role_assignments_assignee_id_workspace_id_index" ON "workspace_role_assignments" USING btree ("assignee_id","workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_role_assignments_workspace_id_index" ON "workspace_role_assignments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspaces_organization_id_id_index" ON "workspaces" USING btree ("organization_id","id");