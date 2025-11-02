import { getDbClient } from "@core/database/db";
import {
  computeUnreadStatus,
  updateReadTimestamp,
} from "@core/domain/inbox/unread-helper";
import type { ApiEnv } from "@core/helpers/api-env";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const inboxMarkReadRoute = new Hono<ApiEnv>()
  .post("/:id/mark-read", async (c) => {
    const db = getDbClient();
    const conversationId = c.req.param("id");

    // Get conversation
    const [conversation] = await db
      .select()
      .from(inboxConversationsTable)
      .where(eq(inboxConversationsTable.id, conversationId))
      .limit(1);

    if (!conversation)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );

    // Update metadata with current timestamp
    const updatedMetadata = updateReadTimestamp(
      conversation.metadata,
      conversation.platform,
      conversation.channel,
      new Date(),
    );

    // Save
    await db
      .update(inboxConversationsTable)
      .set({ metadata: updatedMetadata })
      .where(eq(inboxConversationsTable.id, conversationId));

    // Compute new unread status
    const { isUnread, lastReadAt } = computeUnreadStatus({
      lastMessageAt: conversation.lastMessageAt,
      metadata: updatedMetadata,
      platform: conversation.platform,
      channel: conversation.channel,
    });

    // TODO: Dispatch realtime event when pusher is available

    return c.json({ success: true, isUnread, lastReadAt });
  })
  .post("/:id/mark-unread", async (c) => {
    const db = getDbClient();
    const conversationId = c.req.param("id");

    // Get conversation
    const [conversation] = await db
      .select()
      .from(inboxConversationsTable)
      .where(eq(inboxConversationsTable.id, conversationId))
      .limit(1);

    if (!conversation)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );

    // Update metadata with a very old timestamp to ensure it's unread
    const veryOldTimestamp = new Date(0); // Unix epoch
    const updatedMetadata = updateReadTimestamp(
      conversation.metadata,
      conversation.platform,
      conversation.channel,
      veryOldTimestamp,
    );

    // Save
    await db
      .update(inboxConversationsTable)
      .set({ metadata: updatedMetadata })
      .where(eq(inboxConversationsTable.id, conversationId));

    // Compute new unread status (should be true)
    const { isUnread, lastReadAt } = computeUnreadStatus({
      lastMessageAt: conversation.lastMessageAt,
      metadata: updatedMetadata,
      platform: conversation.platform,
      channel: conversation.channel,
    });

    // TODO: Dispatch realtime event when pusher is available

    return c.json({ success: true, isUnread, lastReadAt });
  });
