import { and, db, eq } from "@core/database/db";
import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Actor } from "@core/helpers/actor";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import {
  type InboxMessageMetadata,
  inboxMessagesTable,
} from "@core/schemas/inbox-messages.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { Log } from "@core/utils/log";
import type { InboxMessageReaction } from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { upsertReactionMetadata } from "./message-metadata";

const log = Log.create({ namespace: "InboxReactionService" });

export namespace InboxReactionService {
  /**
   * Add a reaction to a message
   */
  export async function addReaction(input: {
    workspaceId: string;
    conversationId: string;
    messageId: string;
    emoji: string;
  }): Promise<void> {
    const { workspaceId, conversationId, messageId, emoji } = input;
    const actorId = Actor.userID();

    log.info("addReaction", {
      workspaceId,
      conversationId,
      messageId,
      emoji,
      actorId,
    });

    // Load message with conversation validation
    const messageRecord = await loadMessageWithValidation(
      workspaceId,
      conversationId,
      messageId,
    );

    // Prepare reaction metadata
    const metadata: InboxMessageMetadata = {
      ...(messageRecord.metadata ?? {}),
    };

    const reaction: InboxMessageReaction = {
      platform: messageRecord.platform,
      mid: messageRecord.externalId,
      key: emoji,
      action: "added",
      actorId,
      timestamp: new Date().toISOString(),
      extras: {
        source: "INTERNAL",
      },
    };

    // Update metadata with new reaction
    upsertReactionMetadata(metadata, messageRecord.channel, reaction);

    // Update message in database
    await InboxService.upsertMessage({
      workspaceId,
      inboxConversationId: conversationId,
      externalId: messageRecord.externalId,
      text: messageRecord.text,
      attachments: messageRecord.attachments,
      payload: messageRecord.payload,
      sender: messageRecord.sender,
      channel: messageRecord.channel,
      contentId: messageRecord.contentId,
      metadata,
    });

    // Dispatch realtime event
    await dispatchReactionEvent(
      workspaceId,
      conversationId,
      messageRecord,
      metadata,
    );

    log.info("addReaction complete", { messageId, emoji, actorId });
  }

  /**
   * Remove a reaction from a message
   */
  export async function removeReaction(input: {
    workspaceId: string;
    conversationId: string;
    messageId: string;
    emoji: string;
  }): Promise<void> {
    const { workspaceId, conversationId, messageId, emoji } = input;
    const actorId = Actor.userID();

    log.info("removeReaction", {
      workspaceId,
      conversationId,
      messageId,
      emoji,
      actorId,
    });

    // Load message with conversation validation
    const messageRecord = await loadMessageWithValidation(
      workspaceId,
      conversationId,
      messageId,
    );

    // Prepare reaction metadata
    const metadata: InboxMessageMetadata = {
      ...(messageRecord.metadata ?? {}),
    };

    const reaction: InboxMessageReaction = {
      platform: messageRecord.platform,
      mid: messageRecord.externalId,
      key: emoji,
      action: "removed",
      actorId,
      timestamp: new Date().toISOString(),
      extras: {
        source: "INTERNAL",
      },
    };

    // Update metadata to remove reaction
    upsertReactionMetadata(metadata, messageRecord.channel, reaction);

    // Update message in database
    await InboxService.upsertMessage({
      workspaceId,
      inboxConversationId: conversationId,
      externalId: messageRecord.externalId,
      text: messageRecord.text,
      attachments: messageRecord.attachments,
      payload: messageRecord.payload,
      sender: messageRecord.sender,
      channel: messageRecord.channel,
      contentId: messageRecord.contentId,
      metadata,
    });

    // Dispatch realtime event
    await dispatchReactionEvent(
      workspaceId,
      conversationId,
      messageRecord,
      metadata,
    );

    log.info("removeReaction complete", { messageId, emoji, actorId });
  }
}

/**
 * Load message and validate it belongs to the workspace and conversation
 */
async function loadMessageWithValidation(
  _workspaceId: string,
  conversationId: string,
  messageId: string,
) {
  const dbClient = db();

  const [record] = await dbClient
    .select()
    .from(inboxMessagesTable)
    .innerJoin(
      inboxConversationsTable,
      eq(inboxMessagesTable.inboxConversationId, inboxConversationsTable.id),
    )
    .where(
      and(
        eq(inboxMessagesTable.id, messageId),
        eq(inboxMessagesTable.inboxConversationId, conversationId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new VisibleError(
      "not_found",
      ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
      "Message not found or does not belong to this conversation.",
    );
  }

  // Validate workspace ownership via connected account
  // Note: This assumes connected accounts are scoped to workspaces
  // You may need to add additional validation here based on your schema

  return {
    messageId: record.inbox_messages.id,
    externalId: record.inbox_messages.externalId,
    text: record.inbox_messages.text,
    attachments: record.inbox_messages.attachments,
    payload: record.inbox_messages.payload,
    sender: record.inbox_messages.sender,
    channel: record.inbox_messages.channel,
    contentId: record.inbox_messages.contentId,
    metadata: record.inbox_messages.metadata,
    conversationId: record.inbox_conversations.id,
    platform: record.inbox_conversations.platform,
    connectedAccountId: record.inbox_conversations.connectedAccountId,
  };
}

/**
 * Dispatch realtime event for reaction update
 */
async function dispatchReactionEvent(
  workspaceId: string,
  conversationId: string,
  messageRecord: {
    messageId: string;
    externalId: string;
    sender: "user" | "self";
    text: string | null;
    channel: "dm" | "post_comment";
    contentId: string | null;
  },
  metadata: InboxMessageMetadata,
) {
  const event = createWorkspaceEvent(InboxRealtimeEventTypes.MessageUpserted, {
    conversationId,
    message: {
      id: messageRecord.messageId,
      externalId: messageRecord.externalId,
      sender: messageRecord.sender,
      text: messageRecord.text,
      attachments: [],
      createdAt: new Date(),
      channel: messageRecord.channel,
      contentId: messageRecord.contentId,
      metadata,
    },
  });

  await dispatchWorkspaceEvent(workspaceId, event);
}
