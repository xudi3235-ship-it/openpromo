import { getDbClient } from "@core/database/db";
import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Actor } from "@core/helpers/actor";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  type InboxChannel,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { AllPlatforms } from "@shared/content";
import type {
  InboxAttachment,
  InboxMessageMetadata,
  MessagePayload,
} from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { and, eq } from "drizzle-orm";
import { CommentReplyHandler } from "./reply/comment-reply-handler";
import { DMReplyHandler } from "./reply/dm-reply-handler";
import type {
  CommentReplyContext,
  DMReplyContext,
  ReplyContext,
  SendReplyInput,
} from "./reply/types";

type ConversationRow = {
  id: string;
  platform: AllPlatforms;
  channel: InboxChannel;
  externalThreadId: string | null;
  contentId: string | null;
  conversationMetadata: Record<string, unknown> | null;
  contactExternalId: string;
  accessToken: string;
  connectedAccountId: string;
  connectedAccountExternalId: string;
  refreshToken: string | null;
};

export namespace InboxReplyService {
  export async function sendReply({
    conversationId,
    text,
    attachments,
    replyToMessageId,
  }: SendReplyInput) {
    if (replyToMessageId) {
      console.info("[Inbox Reply] replying to message", {
        conversationId,
        replyToMessageId,
      });
    }

    const trimmedText = text.trim();
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.filter((attachment): attachment is InboxAttachment =>
          Boolean(attachment?.url && attachment.type),
        )
      : [];

    const workspaceId = Actor.workspaceID();
    const db = getDbClient();

    let resolvedReplyToMessageId: string | null = null;
    if (replyToMessageId) {
      const messageRow = await db
        .select({ externalId: inboxMessagesTable.externalId })
        .from(inboxMessagesTable)
        .where(
          and(
            eq(inboxMessagesTable.id, replyToMessageId),
            eq(inboxMessagesTable.inboxConversationId, conversationId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (messageRow) {
        resolvedReplyToMessageId = messageRow.externalId;
        console.info("[Inbox Reply] Resolved replyToMessageId", {
          internalId: replyToMessageId,
          externalId: resolvedReplyToMessageId,
        });
      } else {
        console.warn(
          `[Inbox Reply] Reply target message not found or does not belong to conversation: ${replyToMessageId}`,
        );
      }
    }

    const row = await loadConversation(db, workspaceId, conversationId);
    if (!row) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );
    }

    // Build base context
    const baseContext: ReplyContext = {
      conversationId: row.id,
      platform: row.platform,
      channel: row.channel,
      connectedAccountId: row.connectedAccountId,
      connectedAccountExternalId: row.connectedAccountExternalId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      contactExternalId: row.contactExternalId,
      workspaceId,
    };

    // Route to appropriate handler
    if (row.channel === "dm") {
      const dmContext: DMReplyContext = {
        ...baseContext,
        channel: "dm",
      };
      const sentMessages = await DMReplyHandler.send(dmContext, {
        text: trimmedText.length > 0 ? trimmedText : null,
        attachments: normalizedAttachments,
        replyToMessageId: resolvedReplyToMessageId,
      });

      // Persist messages immediately
      if (sentMessages && sentMessages.length > 0) {
        const metadata: Record<string, unknown> = {};
        if (replyToMessageId) {
          if (!metadata.extra) {
            metadata.extra = {};
          }
          (metadata.extra as Record<string, unknown>).replyToMessageId =
            replyToMessageId;
        }

        // When message is split (attachment + text), we need to save each part correctly
        for (const msg of sentMessages) {
          // Create minimal payload that satisfies MessagePayload union type
          // Using FBMessagePayload structure as base (works for both FB and IG)
          const minimalPayload = {
            sender: { id: row.connectedAccountExternalId },
            recipient: { id: row.contactExternalId },
            timestamp: Math.floor(Date.now() / 1000),
          };

          // Determine what content to save based on message type
          let messageText: string | null = null;
          let messageAttachments: InboxAttachment[] = [];

          if (msg.type === "attachment") {
            // Only attachment, no text
            messageAttachments = normalizedAttachments;
          } else if (msg.type === "text") {
            // Only text, no attachment
            messageText = trimmedText.length > 0 ? trimmedText : null;
          } else {
            // Combined message (both text and attachment in one message)
            messageText = trimmedText.length > 0 ? trimmedText : null;
            messageAttachments = normalizedAttachments;
          }

          const created = await InboxService.upsertMessage({
            workspaceId,
            inboxConversationId: row.id,
            externalId: msg.mid,
            text: messageText,
            attachments: messageAttachments,
            payload: minimalPayload as MessagePayload,
            sender: "self",
            channel: "dm",
            metadata,
          });

          // Emit real event immediately since we have persisted it.
          // This is critical for local dev where webhook might hit prod.
          const upsertEvent = createWorkspaceEvent(
            InboxRealtimeEventTypes.MessageUpserted,
            {
              conversationId: row.id,
              message: {
                id: created.id,
                externalId: created.externalId,
                sender: created.sender,
                text: created.text,
                attachments: created.attachments,
                createdAt: created.createdAt,
                channel: created.channel,
                contentId: created.contentId,
                metadata: created.metadata,
              },
            },
          );
          await dispatchWorkspaceEvent(workspaceId, upsertEvent);
        }
      }
    } else if (row.channel === "post_comment") {
      const commentContext: CommentReplyContext = {
        ...baseContext,
        channel: "post_comment",
        externalThreadId: row.externalThreadId,
        contentId: row.contentId,
        conversationMetadata: (row.conversationMetadata ??
          {}) as InboxMessageMetadata,
      };
      await CommentReplyHandler.send(
        commentContext,
        trimmedText,
        normalizedAttachments,
      );
      await emitPendingReplyEvent(
        row.id,
        row.channel,
        workspaceId,
        trimmedText,
        normalizedAttachments,
        replyToMessageId,
      );
    } else {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        `Unsupported conversation channel: ${row.channel}`,
      );
    }
  }
}

async function loadConversation(
  db: ReturnType<typeof getDbClient>,
  workspaceId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select({
      id: inboxConversationsTable.id,
      platform: inboxConversationsTable.platform,
      channel: inboxConversationsTable.channel,
      externalThreadId: inboxConversationsTable.externalThreadId,
      contentId: inboxConversationsTable.contentId,
      conversationMetadata: inboxConversationsTable.metadata,
      contactExternalId: inboxContactsTable.externalId,
      accessToken: connectedAccount.encryptedAccessToken,
      connectedAccountId: connectedAccount.id,
      connectedAccountExternalId: connectedAccount.externalAccountId,
      refreshToken: connectedAccount.refreshToken,
    })
    .from(inboxConversationsTable)
    .innerJoin(
      connectedAccount,
      eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
    )
    .innerJoin(
      inboxContactsTable,
      eq(inboxConversationsTable.contactId, inboxContactsTable.id),
    )
    .where(
      and(
        eq(inboxConversationsTable.id, conversationId),
        eq(connectedAccount.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function emitPendingReplyEvent(
  conversationId: string,
  channel: InboxChannel,
  workspaceId: string,
  text: string,
  attachments: InboxAttachment[],
  replyToMessageId?: string | null,
) {
  const metadata: Record<string, unknown> = { pendingEcho: true };
  if (replyToMessageId) {
    if (!metadata.extra) {
      metadata.extra = {};
    }
    (metadata.extra as Record<string, unknown>).replyToMessageId =
      replyToMessageId;
  }

  const pendingEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId,
      message: {
        id: "",
        externalId: "",
        sender: "self",
        text: text.trim().length > 0 ? text : null,
        attachments: attachments.map((attachment) => ({ ...attachment })),
        createdAt: new Date(),
        channel,
        contentId: null,
        metadata,
      },
    },
  );
  await dispatchWorkspaceEvent(workspaceId, pendingEvent);
}
