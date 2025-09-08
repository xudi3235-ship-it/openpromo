import { id, timestamps } from "@core/helpers/db";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    ...id,
    workosId: text().notNull(),
    defaultWorkspaceSlug: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.workosId)],
);

export type User = typeof usersTable.$inferSelect;
