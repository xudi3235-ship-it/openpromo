import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps } from "../drizzle/types";

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
