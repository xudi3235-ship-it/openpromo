import { index, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { id, timestamp, timestamps } from "../drizzle/types";
import { userID } from "../user/user.sql";
import { workspaceID } from "../workspace/workspace.sql";

export const userWorkspaceTable = pgTable(
  "user_workspace",
  {
    ...id,
    ...userID,
    ...workspaceID,
    roleId: varchar("role_id", { length: 255 }).notNull(), // soon will change to "...roleID", too.
    joinedAt: timestamp("joined_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uk_user_workspace").on(t.workspaceID, t.userID),
    index("idx_user_primary").on(t.userID),
  ],
);
