import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "@/drizzle/types";
import { workspaceRoles } from "./workspace_roles.sql";
import { workspaces } from "./workspaces.sql";

export const assigneeType = pgEnum("assignee_type", ["user", "group"]);

export const workspaceRoleAssignments = pgTable("workspace_role_assignments", {
  id: ulid().primaryKey(),
  workspaceId: ulid()
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  roleId: ulid()
    .references(() => workspaceRoles.id, { onDelete: "cascade" })
    .notNull(),
  assigneeType: assigneeType().notNull(),
  assigneeId: text().notNull(), // user or group id from WorkOS
  ...timestamps,
});

export type WorkspaceRoleAssignment =
  typeof workspaceRoleAssignments.$inferSelect;
