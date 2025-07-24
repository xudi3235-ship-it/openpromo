import {
  boolean,
  foreignKey,
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
  index,
} from "drizzle-orm/mysql-core";
import { timestamps, id } from "../drizzle/types";

export const workspace = mysqlTable(
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

export function workspaceIndexes(table: any) {
  return [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    index("id_idx").on(table.id),
    foreignKey({
      foreignColumns: [workspace.id],
      columns: [table.workspaceID],
    }),
  ];
}
