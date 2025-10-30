import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export const inboxGetUnreadCountRoute = new Hono<ApiEnv>().get(
  "/unread-count",
  async (c) => {
    const db = getDbClient();
    const workspaceId = Actor.workspaceID();

    const rows = await db
      .select({
        lastMessageAt: inboxConversationsTable.lastMessageAt,
        metadata: inboxConversationsTable.metadata,
        platform: inboxConversationsTable.platform,
        channel: inboxConversationsTable.channel,
      })
      .from(inboxConversationsTable)
      .innerJoin(
        connectedAccount,
        eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
      )
      .where(eq(connectedAccount.workspaceId, workspaceId));

    // Count unread conversations
    const unreadCount = rows.filter((row) => {
      const { isUnread } = computeUnreadStatus({
        lastMessageAt: row.lastMessageAt,
        metadata: row.metadata,
        platform: row.platform,
        channel: row.channel,
      });
      return isUnread;
    }).length;

    return c.json({ unreadCount });
  },
);
