import { pgTable, text } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "@/drizzle/types";

export const workspaceRoles = pgTable("workspace_roles", {
  id: ulid().primaryKey(),
  name: text().notNull(),
  description: text(),
  slug: text().notNull().unique(),
  ...timestamps,
});

export type WorkspaceRole = typeof workspaceRoles.$inferSelect;
