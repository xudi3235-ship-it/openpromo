import { id, timestamps } from "@core/database/types";
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    ...id,
    ...timestamps,
    workosId: text().notNull(),
    defaultWorkspaceSlug: text(),
  },
  (t) => [uniqueIndex().on(t.workosId)],
);

export type User = typeof usersTable.$inferSelect;
