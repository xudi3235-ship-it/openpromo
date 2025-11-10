import { getDbClient } from "@core/database/db";
import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import {
  computeUnreadStatus,
  updateReadTimestamp,
} from "@core/domain/inbox/unread-helper";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ConversationRow } from "../../../routes/api/workspaces/inbox/routes/utils/conversation-loader";
import { loadConversationForWorkspace } from "../../../routes/api/workspaces/inbox/routes/utils/conversation-loader";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const MarkConversationInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1),
  }),
);

const MarkConversationOutput = z.object({
  success: z.literal(true),
  isUnread: z.boolean(),
  lastReadAt: z.date().nullable(),
});

async function markRemoteThreadSeen(conversation: ConversationRow) {
  if (conversation.channel !== "dm") return;
  const recipientId = conversation.contactExternalId;
  if (!recipientId) return;

  const body = {
    recipient: { id: recipientId },
    sender_action: "mark_seen",
  } as const;

  try {
    if (conversation.platform === "FACEBOOK") {
      await facebookGraphRequest(
        {
          accessToken: conversation.accessToken,
          rateLimitKey: `facebook:${conversation.connectedAccountId}`,
        },
        "/me/messages",
        { method: "POST", body },
      );
    } else if (conversation.platform === "INSTAGRAM") {
      await instagramGraphRequest(
        {
          accessToken: conversation.accessToken,
          rateLimitKey: `instagram:${conversation.connectedAccountId}`,
        },
        "/me/messages",
        { method: "POST", body },
      );
    }
  } catch (error) {
    console.error("[Inbox][mark-read] Failed to sync read receipt", {
      conversationId: conversation.id,
      platform: conversation.platform,
      error,
    });
  }
}

async function handleMarkConversation({
  conversationId,
  workspaceId,
  timestamp,
}: {
  conversationId: string;
  workspaceId: string;
  timestamp: Date;
}) {
  const db = getDbClient();
  const conversation = await loadConversationForWorkspace(
    db,
    conversationId,
    workspaceId,
  );

  if (!conversation) {
    throw new VisibleError(
      "not_found",
      ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
      "Conversation not found.",
    );
  }

  const updatedMetadata = updateReadTimestamp(
    conversation.metadata,
    conversation.platform,
    conversation.channel,
    timestamp,
  );

  await db
    .update(inboxConversationsTable)
    .set({ metadata: updatedMetadata })
    .where(eq(inboxConversationsTable.id, conversation.id));

  const { isUnread, lastReadAt } = computeUnreadStatus({
    lastMessageAt: conversation.lastMessageAt,
    metadata: updatedMetadata,
    platform: conversation.platform,
    channel: conversation.channel,
  });

  return { conversation, isUnread, lastReadAt };
}

export const markConversationRead = orpcBuilder
  .input(MarkConversationInput)
  .output(MarkConversationOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;
    const { conversation, isUnread, lastReadAt } = await handleMarkConversation(
      {
        conversationId: input.conversationId,
        workspaceId,
        timestamp: new Date(),
      },
    );
    await markRemoteThreadSeen(conversation);
    return { success: true as const, isUnread, lastReadAt };
  });

export const markConversationUnread = orpcBuilder
  .input(MarkConversationInput)
  .output(MarkConversationOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;
    const { isUnread, lastReadAt } = await handleMarkConversation({
      conversationId: input.conversationId,
      workspaceId,
      timestamp: new Date(0),
    });
    return { success: true as const, isUnread, lastReadAt };
  });
