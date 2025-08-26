import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { id, timestamps } from "../drizzle/types";

export const workspaceRoleTypes = pgEnum("workspace_role_types", [
  "workspace_admin",
  "workspace_editor",
  "workspace_viewer",
]);

export const workspaceRolesTable = pgTable("workspace_roles", {
  ...id,
  name: text().notNull(),
  description: text(),
  slug: workspaceRoleTypes().unique().notNull(),
  ...timestamps,
});

export type WorkspaceRole = typeof workspaceRolesTable.$inferSelect;
