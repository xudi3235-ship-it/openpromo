import { id, timestamps, ulid } from "@core/helpers/db";
import { AllMessageAttachmentTypes, type MessagePayload } from "@shared/inbox";
import { jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { inboxContactsTable } from "./inbox-contacts.sql";
import { inboxConversationsTable } from "./inbox-conversations.sql";

export const messageType = pgEnum("message_type", [
  "text",
  ...Object.values(AllMessageAttachmentTypes),
]);

type MessageAttachment = {
  type: (typeof AllMessageAttachmentTypes)[keyof typeof AllMessageAttachmentTypes];
  url: string;
};

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
    text: text(),
    attachments: jsonb().$type<MessageAttachment[]>().notNull(),
    payload: jsonb().$type<MessagePayload>().notNull(), // raw payload from the platform
  },
  (t) => [uniqueIndex().on(t.inboxConversationId, t.externalId)],
);
