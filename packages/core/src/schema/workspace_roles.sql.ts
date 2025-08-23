import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "@/drizzle/types";

export const workspaceRoleTypes = pgEnum("workspace_role_types", [
  "workspace_admin",
  "workspace_editor",
  "workspace_viewer",
]);

export const workspaceRoles = pgTable("workspace_roles", {
  id: ulid().primaryKey(),
  name: text().notNull(),
  description: text(),
  slug: workspaceRoleTypes().unique().notNull(),
  ...timestamps,
});

export type WorkspaceRole = typeof workspaceRoles.$inferSelect;
