import { id, timestamp, timestamps, ulid } from "@core/helpers/db";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { connectedAccount, platformPgEnum } from "./connected-account.sql";
import { inboxContactsTable } from "./inbox-contacts.sql";

export const inboxChannelEnum = pgEnum("inbox_channel", ["dm", "post_comment"]);
export type InboxChannel = (typeof inboxChannelEnum.enumValues)[number];

export const inboxConversationsTable = pgTable(
  "inbox_conversations",
  {
    ...id,
    ...timestamps,
    connectedAccountId: ulid().references(() => connectedAccount.id, {
      onDelete: "cascade",
    }),
    contactId: ulid().references(() => inboxContactsTable.id, {
      onDelete: "cascade",
    }),
    platform: platformPgEnum().notNull(), // redundant, but useful for filtering
    channel: inboxChannelEnum().notNull().default("dm"),
    threadKey: text("thread_key").notNull(),
    externalThreadId: text("external_thread_id"),
    // link to unified content if any, for comments
    contentId: ulid("content_id").references(() => unifiedContentTable.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    lastMessageAt: timestamp().notNull(),
  },
  (t) => [
    uniqueIndex()
      .on(t.connectedAccountId, t.contactId)
      .where(sql`${t.channel} = 'dm'::inbox_channel`),
    uniqueIndex().on(t.connectedAccountId, t.channel, t.threadKey),
    // Query optimization indices
    index().on(t.connectedAccountId, t.lastMessageAt.desc()),
    index().on(t.connectedAccountId, t.channel, t.lastMessageAt.desc()),
    index().on(t.platform, t.connectedAccountId, t.lastMessageAt.desc()),
    index().on(t.contentId),
  ],
);
