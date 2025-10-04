DROP INDEX "workspace_invites_invitation_id_idx";--> statement-breakpoint
CREATE INDEX "workspace_invites_invitation_id_idx" ON "workspace_invites" USING btree ("invitation_id");