import { id, timestamps, ulid } from "@core/database/types";
import { index, pgTable, text, unique } from "drizzle-orm/pg-core";

export const workspacesTable = pgTable(
  "workspaces",
  {
    ...id,
    ...timestamps,
    organizationId: text().notNull(), // organization id from WorkOS
    name: text().notNull(),
    slug: text().notNull(),
    profilePictureUrl: text("profile_picture_url"),
    profilePictureKey: text("profile_picture_key"),
  },
  (t) => [
    index().on(t.slug),
    index().on(t.organizationId, t.id),
    unique().on(t.organizationId, t.slug), // workspace slug is unique within an organization
  ],
);

export type Workspace = typeof workspacesTable.$inferSelect;

// Reusable helper for workspace foreign key reference (spreadable)
export const workspaceID = {
  workspaceId: ulid()
    .references(() => workspacesTable.id, { onDelete: "cascade" })
    .notNull(),
};
