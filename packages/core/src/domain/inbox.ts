import { and, db, eq } from "@core/database/db";
import type { Platform } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  type InboxChannel,
  inboxChannelEnum,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import {
  type InboxMessageStatus,
  inboxMessageStateTable,
} from "@core/schemas/inbox-message-state.sql";
import {
  type InboxMessageMetadata,
  type InboxMessageSender,
  inboxMessagesTable,
  type MessageAttachment,
} from "@core/schemas/inbox-messages.sql";
import { Log } from "@core/utils/log";
import type { MessagePayload } from "@shared/inbox";

const log = Log.create({ namespace: "InboxService" });

export namespace InboxService {
  export async function findConversationByExternalThreadId(input: {
    connectedAccountId: string;
    externalThreadId: string;
    channel: InboxChannel;
  }) {
    const [existing] = await db()
      .select()
      .from(inboxConversationsTable)
      .where(
        and(
          eq(
            inboxConversationsTable.connectedAccountId,
            input.connectedAccountId,
          ),
          eq(inboxConversationsTable.channel, input.channel),
          eq(inboxConversationsTable.externalThreadId, input.externalThreadId),
        ),
      )
      .limit(1);
    return existing ?? null;
  }
  export async function getConversation(input: {
    connectedAccountId: string;
    contactId: string;
    channel?: InboxChannel;
  }) {
    const channel = input.channel ?? "dm";
    const [existing] = await db()
      .select()
      .from(inboxConversationsTable)
      .where(
        and(
          eq(
            inboxConversationsTable.connectedAccountId,
            input.connectedAccountId,
          ),
          eq(inboxConversationsTable.contactId, input.contactId),
          eq(inboxConversationsTable.channel, channel),
        ),
      )
      .limit(1);
    return existing ?? null;
  }
  export async function findContact(input: {
    platform: Platform;
    externalId: string;
  }) {
    const [existing] = await db()
      .select()
      .from(inboxContactsTable)
      .where(
        and(
          eq(inboxContactsTable.platform, input.platform),
          eq(inboxContactsTable.externalId, input.externalId),
        ),
      )
      .limit(1);
    const found = existing ?? null;
    log.info("findContact", {
      platform: input.platform,
      externalId: input.externalId,
      found: !!found,
    });
    return found;
  }

  export async function createContact(input: {
    platform: Platform;
    externalId: string;
    name: string;
    profilePicUrl: string;
  }) {
    const [created] = await db()
      .insert(inboxContactsTable)
      .values({
        platform: input.platform,
        externalId: input.externalId,
        name: input.name,
        profilePicUrl: input.profilePicUrl,
      })
      .returning();
    log.info("createContact", {
      platform: input.platform,
      externalId: input.externalId,
      name: input.name,
    });
    return created;
  }

  export async function upsertConversation(input: {
    connectedAccountId: string;
    platform: Platform;
    contactId: string;
    lastMessageAt: Date;
    channel?: InboxChannel;
    threadKey?: string;
    externalThreadId?: string | null;
    contentId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const channel = input.channel ?? inboxChannelEnum.enumValues[0]; // default "dm"
    const threadKey =
      input.threadKey ??
      (channel === "dm"
        ? input.contactId
        : (input.externalThreadId ?? input.contactId));

    const insertValues = {
      connectedAccountId: input.connectedAccountId,
      contactId: input.contactId,
      platform: input.platform,
      channel,
      threadKey,
      externalThreadId: input.externalThreadId ?? null,
      contentId: input.contentId ?? null,
      metadata: input.metadata ?? {},
      lastMessageAt: input.lastMessageAt,
    };

    const updateValues: Partial<typeof insertValues> = {
      contactId: input.contactId,
      platform: input.platform,
      lastMessageAt: input.lastMessageAt,
    };

    if (input.externalThreadId !== undefined) {
      updateValues.externalThreadId = input.externalThreadId ?? null;
    }
    if (input.contentId !== undefined) {
      updateValues.contentId = input.contentId ?? null;
    }
    if (input.metadata) {
      updateValues.metadata = input.metadata;
    }
    if (input.threadKey) {
      updateValues.threadKey = input.threadKey;
    }

    const [row] = await db()
      .insert(inboxConversationsTable)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [
          inboxConversationsTable.connectedAccountId,
          inboxConversationsTable.channel,
          inboxConversationsTable.threadKey,
        ],
        set: updateValues,
      })
      .returning();
    log.info("upsertConversation", {
      connectedAccountId: input.connectedAccountId,
      contactId: input.contactId,
      channel,
      threadKey,
    });
    return row;
  }

  export async function upsertMessage(input: {
    workspaceId: string;
    inboxConversationId: string;
    externalId: string;
    text?: string | null;
    attachments?: MessageAttachment[];
    payload: MessagePayload;
    sender: InboxMessageSender;
    channel: InboxChannel;
    contentId?: string | null;
    metadata?: InboxMessageMetadata;
    statusOnInsert?: InboxMessageStatus;
  }) {
    const insertValues = {
      inboxConversationId: input.inboxConversationId,
      externalId: input.externalId,
      sender: input.sender,
      channel: input.channel,
      contentId: input.contentId ?? null,
      text: input.text ?? null,
      attachments: input.attachments ?? [],
      payload: input.payload,
      metadata: input.metadata ?? {},
    };

    const updateValues: Partial<typeof insertValues> = {
      sender: input.sender,
      text: input.text ?? null,
      payload: input.payload,
    };

    if (input.attachments) {
      updateValues.attachments = input.attachments;
    }
    if (input.contentId !== undefined) {
      updateValues.contentId = input.contentId ?? null;
    }
    if (input.metadata) {
      updateValues.metadata = input.metadata;
    }
    updateValues.channel = input.channel;

    const [created] = await db()
      .insert(inboxMessagesTable)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [
          inboxMessagesTable.inboxConversationId,
          inboxMessagesTable.externalId,
        ],
        set: updateValues,
      })
      .returning();

    await db()
      .insert(inboxMessageStateTable)
      .values({
        workspaceId: input.workspaceId,
        messageId: created.id,
        status: input.statusOnInsert ?? "open",
      })
      .onConflictDoNothing();

    log.info("upsertMessage", {
      inboxConversationId: input.inboxConversationId,
      externalId: input.externalId,
      sender: input.sender,
      text: input.text,
      attachmentCount: input.attachments?.length ?? 0,
      channel: input.channel,
    });
    return created;
  }
}
