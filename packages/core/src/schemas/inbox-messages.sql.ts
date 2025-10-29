import { id, timestamps, ulid } from "@core/helpers/db";
import { unifiedContentTable } from "@core/schemas/content.sql";
import type {
  AllMessageAttachmentTypes,
  MessagePayload,
  InboxMessageMetadata as SharedInboxMessageMetadata,
} from "@shared/inbox";
import { jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import {
  type InboxChannel,
  inboxChannelEnum,
  inboxConversationsTable,
} from "./inbox-conversations.sql";

export const senderEnum = pgEnum("sender", ["user", "self"]);
export type InboxMessageSender = (typeof senderEnum.enumValues)[number];
export type InboxMessageChannel = InboxChannel;

export type MessageAttachment = {
  type: (typeof AllMessageAttachmentTypes)[keyof typeof AllMessageAttachmentTypes];
  url: string;
};

export type InboxMessageMetadata = SharedInboxMessageMetadata;

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
    channel: inboxChannelEnum().notNull().default("dm"),
    contentId: ulid("content_id").references(() => unifiedContentTable.id, {
      onDelete: "set null",
    }),
    text: text(),
    attachments: jsonb().$type<MessageAttachment[]>().notNull(),
    payload: jsonb().$type<MessagePayload>().notNull(), // raw payload from the platform
    metadata: jsonb().$type<InboxMessageMetadata>().notNull().default({}),
  },
  (t) => [uniqueIndex().on(t.inboxConversationId, t.externalId)],
);
