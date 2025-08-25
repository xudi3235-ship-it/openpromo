import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "../drizzle/types";
import { workspaceRolesTable } from "./workspace_roles.sql";
import { workspacesTable } from "./workspaces.sql";

export const assigneeType = pgEnum("assignee_type", ["user", "group"]);

export const workspaceRoleAssignmentsTable = pgTable(
  "workspace_role_assignments",
  {
    id: ulid().primaryKey().default(sql`gen_ulid()`),
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
  (t) => [
    uniqueIndex().on(t.assigneeId, t.workspaceId),
    index().on(t.workspaceId),
  ],
);

export type WorkspaceRoleAssignment =
  typeof workspaceRoleAssignmentsTable.$inferSelect;
