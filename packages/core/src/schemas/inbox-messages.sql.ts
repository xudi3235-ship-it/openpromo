import { id, timestamps, ulid } from "@core/helpers/db";
import type { AllMessageAttachmentTypes, MessagePayload } from "@shared/inbox";
import { jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { inboxConversationsTable } from "./inbox-conversations.sql";

export const senderEnum = pgEnum("sender", ["user", "self"]);
export type InboxMessageSender = (typeof senderEnum.enumValues)[number];

export type MessageAttachment = {
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
    externalId: text().notNull(), // external message id from the platform
    sender: senderEnum().notNull(),
    text: text(),
    attachments: jsonb().$type<MessageAttachment[]>().notNull(),
    payload: jsonb().$type<MessagePayload>().notNull(), // raw payload from the platform
  },
  (t) => [uniqueIndex().on(t.inboxConversationId, t.externalId)],
);
