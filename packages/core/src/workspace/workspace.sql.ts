import {
  foreignKey,
  index,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps, ulid } from "../drizzle/types";

// creates workspace ID for tables
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

export const workspaceTable = mysqlTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    uniqueIndex("slug").on(table.slug),
  ],
);

// biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
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
