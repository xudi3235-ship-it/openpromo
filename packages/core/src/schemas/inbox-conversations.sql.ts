import { id, timestamp, timestamps, ulid } from "@core/helpers/db";
import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { connectedAccount, platformPgEnum } from "./connected-account.sql";
import { inboxContactsTable } from "./inbox-contacts.sql";

export const inboxConversationsTable = pgTable(
  "inbox_conversations",
  {
    ...id,
    ...timestamps,
    connectedAccountId: ulid().references(() => connectedAccount.id),
    contactId: ulid().references(() => inboxContactsTable.id),
    platform: platformPgEnum().notNull(), // redundant, but useful for filtering
    lastMessageAt: timestamp().notNull(),
  },
  (t) => [uniqueIndex().on(t.connectedAccountId, t.contactId)],
);
