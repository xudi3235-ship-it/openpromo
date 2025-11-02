import { getDbClient } from "@core/database/db";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Actor } from "@core/helpers/actor";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  type InboxChannel,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { AllPlatforms } from "@shared/content";
import type { InboxMessageMetadata } from "@shared/inbox";
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
};

export namespace InboxReplyService {
  export async function sendReply({
    conversationId,
    text,
    replyToMessageId,
  }: SendReplyInput) {
    if (replyToMessageId) {
      console.info("[Inbox Reply] replying to message", {
        conversationId,
        replyToMessageId,
      });
    }

    const workspaceId = Actor.workspaceID();
    const db = getDbClient();

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
      accessToken: row.accessToken,
      contactExternalId: row.contactExternalId,
      workspaceId,
    };

    // Route to appropriate handler
    if (row.channel === "dm") {
      const dmContext: DMReplyContext = {
        ...baseContext,
        channel: "dm",
      };
      await DMReplyHandler.send(dmContext, text);
      await emitPendingReplyEvent(row.id, row.channel, workspaceId);
    } else if (row.channel === "post_comment") {
      const commentContext: CommentReplyContext = {
        ...baseContext,
        channel: "post_comment",
        externalThreadId: row.externalThreadId,
        contentId: row.contentId,
        conversationMetadata: (row.conversationMetadata ??
          {}) as InboxMessageMetadata,
      };
      await CommentReplyHandler.send(commentContext, text);
      await emitPendingReplyEvent(row.id, row.channel, workspaceId);
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
) {
  const pendingEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId,
      message: {
        id: "",
        externalId: "",
        sender: "self",
        text: null,
        attachments: [],
        createdAt: new Date(),
        channel,
        contentId: null,
        metadata: { pendingEcho: true },
      },
    },
  );
  await dispatchWorkspaceEvent(workspaceId, pendingEvent);
}
