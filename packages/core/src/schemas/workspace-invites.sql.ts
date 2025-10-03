import { id, timestamps, ulid } from "@core/helpers/db";
import { workspaceID } from "@core/schemas/workspaces.sql";
import { index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaceRolesTable } from "./workspace-roles.sql";

export const workspaceInviteStatusEnum = pgEnum("workspace_invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const workspaceInvitesTable = pgTable(
  "workspace_invites",
  {
    ...id,
    ...timestamps,
    ...workspaceID,
    organizationId: text().notNull(),
    roleId: ulid()
      .references(() => workspaceRolesTable.id, { onDelete: "cascade" })
      .notNull(),
    invitationId: text().notNull(),
    inviterUserId: text().notNull(),
    email: text().notNull(),
    status: workspaceInviteStatusEnum().notNull().default("pending"),
  },
  (t) => [
    uniqueIndex("workspace_invites_invitation_id_idx").on(t.invitationId),
    uniqueIndex("workspace_invites_workspace_email_unique").on(
      t.workspaceId,
      t.email,
    ),
    index("workspace_invites_workspace_email_idx").on(t.workspaceId, t.email),
  ],
);

export type WorkspaceInvite = typeof workspaceInvitesTable.$inferSelect;
