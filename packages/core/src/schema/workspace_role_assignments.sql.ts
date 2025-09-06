import { index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../helpers/db/types";
import { workspaceRolesTable } from "./workspace_roles.sql";
import { workspaceID } from "./workspaces.sql";

export const assigneeType = pgEnum("assignee_type", ["user", "group"]);

export const workspaceRoleAssignmentsTable = pgTable(
  "workspace_role_assignments",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    roleId: ulid()
      .references(() => workspaceRolesTable.id, { onDelete: "cascade" })
      .notNull(),
    assigneeType: assigneeType().notNull(),
    assigneeId: text().notNull(), // user or group id from WorkOS
  },
  (t) => [
    uniqueIndex().on(t.assigneeId, t.workspaceId),
    index().on(t.workspaceId),
  ],
);

export type WorkspaceRoleAssignment =
  typeof workspaceRoleAssignmentsTable.$inferSelect;
