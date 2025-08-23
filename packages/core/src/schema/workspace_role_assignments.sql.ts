import { pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "../drizzle/types";
import { workspaceRolesTable } from "./workspace_roles.sql";
import { workspacesTable } from "./workspaces.sql";

export const assigneeType = pgEnum("assignee_type", ["user", "group"]);

export const workspaceRoleAssignmentsTable = pgTable(
  "workspace_role_assignments",
  {
    id: ulid().primaryKey(),
    workspaceId: ulid()
      .references(() => workspacesTable.id, { onDelete: "cascade" })
      .notNull(),
    roleId: ulid()
      .references(() => workspaceRolesTable.id, { onDelete: "cascade" })
      .notNull(),
    assigneeType: assigneeType().notNull(),
    assigneeId: text().notNull(), // user or group id from WorkOS
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.workspaceId, t.assigneeId)],
);

export type WorkspaceRoleAssignment =
  typeof workspaceRoleAssignmentsTable.$inferSelect;
