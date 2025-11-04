import { getDbClient } from "@core/database/db";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { loadConversationForWorkspace } from "./utils/conversation-loader";

export const inboxDeleteConversationRoute = new Hono<ApiEnv>().delete(
  "/:id",
  async (c) => {
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

    await db
      .delete(inboxConversationsTable)
      .where(eq(inboxConversationsTable.id, conversation.id));

    return c.json({ success: true, conversationId });
  },
);
