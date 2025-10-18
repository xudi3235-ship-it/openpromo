import { id, timestamps, ulid } from "@core/helpers/db";
import { workspaceID } from "@core/schemas/workspaces.sql";
import { jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { inboxMessagesTable } from "./inbox-messages.sql";

export const inboxMessageStatusEnum = pgEnum("inbox_message_status", [
  "open",
  "snoozed",
  "resolved",
]);

export type InboxMessageStatus =
  (typeof inboxMessageStatusEnum.enumValues)[number];

export const inboxMessageStateTable = pgTable(
  "inbox_message_state",
  {
    ...id,
    ...workspaceID,
    ...timestamps,
    messageId: ulid("message_id")
      .references(() => inboxMessagesTable.id, { onDelete: "cascade" })
      .notNull(),
    status: inboxMessageStatusEnum().notNull().default("open"),
    assigneeId: text("assignee_id"),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
  },
  (t) => [
    uniqueIndex().on(t.workspaceId, t.messageId),
    uniqueIndex().on(t.messageId),
  ],
);
