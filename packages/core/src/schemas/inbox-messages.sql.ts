import { id, timestamps, ulid } from "@core/helpers/db";
import { jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { inboxContactsTable } from "./inbox-contacts.sql";
import { inboxConversationsTable } from "./inbox-conversations.sql";

export const messageType = pgEnum("message_type", [
  "text",
  "image",
  "video",
  "audio",
  "file",
  "reel",
  "ig_reel",
]);

export const inboxMessagesTable = pgTable(
  "inbox_messages",
  {
    ...id,
    ...timestamps,
    inboxConversationId: ulid().references(() => inboxConversationsTable.id, {
      onDelete: "cascade",
    }),
    externalId: text().notNull(), // external id from the platform
    senderContactId: ulid().references(() => inboxContactsTable.id, {
      onDelete: "cascade",
    }),
    messageType: messageType().notNull(),
    text: text(),
    mediaUrl: text(),
    payload: jsonb().notNull(), // raw payload from the platform
  },
  (t) => [uniqueIndex().on(t.inboxConversationId, t.externalId)],
);
