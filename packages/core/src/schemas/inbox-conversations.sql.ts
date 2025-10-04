import { id, timestamp, timestamps, ulid } from "@core/helpers/db";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { connectedAccount, platformPgEnum } from "./connected-account.sql";

export const inboxConversationsTable = pgTable(
  "inbox_conversations",
  {
    ...id,
    ...timestamps,
    connectedAccountId: ulid().references(() => connectedAccount.id, {
      onDelete: "cascade",
    }),
    externalId: text().notNull(), // external id from the platform
    platform: platformPgEnum().notNull(), // redundant, but useful for filtering
    lastMessageAt: timestamp().notNull(),
    unreadCount: integer().notNull().default(0),
  },
  (t) => [index().on(t.connectedAccountId)],
);
