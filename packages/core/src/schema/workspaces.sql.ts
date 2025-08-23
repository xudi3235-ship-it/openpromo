import { index, pgTable, text, unique } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "../drizzle/types";

export const workspacesTable = pgTable(
  "workspaces",
  {
    id: ulid().primaryKey(),
    organizationId: text().notNull(), // organization id from WorkOS
    name: text().notNull(),
    slug: text().notNull(),
    ...timestamps,
  },
  (t) => [
    index().on(t.organizationId, t.id),
    unique().on(t.organizationId, t.slug), // workspace slug is unique within an organization
  ],
);

export type Workspace = typeof workspacesTable.$inferSelect;
