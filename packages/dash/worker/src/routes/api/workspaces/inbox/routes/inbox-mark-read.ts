import { getDbClient } from "@core/database/db";
import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import {
  computeUnreadStatus,
  updateReadTimestamp,
} from "@core/domain/inbox/unread-helper";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  type InboxChannel,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { AllPlatforms } from "@shared/content";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

type ConversationRow = {
  id: string;
  platform: AllPlatforms;
  channel: InboxChannel;
  lastMessageAt: Date;
  metadata: Record<string, unknown>;
  connectedAccountId: string;
  accessToken: string;
  contactExternalId: string | null;
};

type DbClient = ReturnType<typeof getDbClient>;

async function loadConversationForWorkspace(
  db: DbClient,
  conversationId: string,
  workspaceId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select({
      id: inboxConversationsTable.id,
      platform: inboxConversationsTable.platform,
      channel: inboxConversationsTable.channel,
      lastMessageAt: inboxConversationsTable.lastMessageAt,
      metadata: inboxConversationsTable.metadata,
      connectedAccountId: inboxConversationsTable.connectedAccountId,
      accessToken: connectedAccount.encryptedAccessToken,
      contactExternalId: inboxContactsTable.externalId,
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

  if (!row) return null;

  return {
    id: row.id,
    platform: row.platform as AllPlatforms,
    channel: row.channel as InboxChannel,
    lastMessageAt: row.lastMessageAt,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    connectedAccountId: row.connectedAccountId as string,
    accessToken: row.accessToken as string,
    contactExternalId: row.contactExternalId ?? null,
  } satisfies ConversationRow;
}

async function markRemoteThreadSeen(conversation: ConversationRow) {
  if (conversation.channel !== "dm") {
    return;
  }

  const recipientId = conversation.contactExternalId;
  if (!recipientId) {
    return;
  }

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
        {
          method: "POST",
          body,
        },
      );
    } else if (conversation.platform === "INSTAGRAM") {
      await instagramGraphRequest(
        {
          accessToken: conversation.accessToken,
          rateLimitKey: `instagram:${conversation.connectedAccountId}`,
        },
        "/me/messages",
        {
          method: "POST",
          body,
        },
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

export const inboxMarkReadRoute = new Hono<ApiEnv>()
  .post("/:id/mark-read", async (c) => {
    const conversationId = c.req.param("id");
    const workspaceId = Actor.workspaceID();
    const db = getDbClient();

    const conversation = await loadConversationForWorkspace(
      db,
      conversationId,
      workspaceId,
    );

    if (!conversation)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );

    const updatedMetadata = updateReadTimestamp(
      conversation.metadata,
      conversation.platform,
      conversation.channel,
      new Date(),
    );

    await db
      .update(inboxConversationsTable)
      .set({ metadata: updatedMetadata })
      .where(eq(inboxConversationsTable.id, conversation.id));

    await markRemoteThreadSeen(conversation);

    const { isUnread, lastReadAt } = computeUnreadStatus({
      lastMessageAt: conversation.lastMessageAt,
      metadata: updatedMetadata,
      platform: conversation.platform,
      channel: conversation.channel,
    });

    return c.json({ success: true, isUnread, lastReadAt });
  })
  .post("/:id/mark-unread", async (c) => {
    const conversationId = c.req.param("id");
    const workspaceId = Actor.workspaceID();
    const db = getDbClient();

    const conversation = await loadConversationForWorkspace(
      db,
      conversationId,
      workspaceId,
    );

    if (!conversation)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );

    const veryOldTimestamp = new Date(0); // Unix epoch
    const updatedMetadata = updateReadTimestamp(
      conversation.metadata,
      conversation.platform,
      conversation.channel,
      veryOldTimestamp,
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

    return c.json({ success: true, isUnread, lastReadAt });
  });
