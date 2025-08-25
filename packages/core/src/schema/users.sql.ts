import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { timestamps, ulid } from "../drizzle/types";

export const usersTable = pgTable(
  "users",
  {
    id: ulid().primaryKey().default(sql`gen_ulid()`),
    workosId: text().notNull(),
    defaultWorkspaceSlug: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.workosId)],
);

export type User = typeof usersTable.$inferSelect;
