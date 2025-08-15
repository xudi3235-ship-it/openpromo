import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";

export const workspaceID = {
  get id() {
    return ulid("id").notNull();
  },
  get workspaceID() {
    return ulid("workspace_id")
      .notNull()
      .references(() => workspaceTable.id, {
        onDelete: "cascade",
      });
  },
};

export const workspaceTable = pgTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    workOsWorkspaceID: varchar("workos_workspace_id", { length: 255 })
      .notNull()
      .unique(),
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    uniqueIndex("slug").on(table.slug),
  ],
);

// biome-ignore lint/suspicious/noExplicitAny: util for table builder
export function workspaceIndexes(table: any) {
  return [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    index("id_idx").on(table.id),
    foreignKey({
      foreignColumns: [workspaceTable.id],
      columns: [table.workspaceID],
    }),
  ];
}
