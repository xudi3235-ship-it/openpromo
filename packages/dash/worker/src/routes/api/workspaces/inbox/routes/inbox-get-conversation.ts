import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { placementSpecToContentPreview } from "@shared/content/content-preview";
import { InboxConversationSummarySchema } from "@shared/inbox";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

export const inboxGetConversationRoute = new Hono<ApiEnv>().get(
  "/:conversationId",
  async (c) => {
    const db = getDbClient();
    const { conversationId } = c.req.param();
    const workspaceId = Actor.workspaceID();

    const [row] = await db
      .select({
        id: inboxConversationsTable.id,
        platform: inboxConversationsTable.platform,
        channel: inboxConversationsTable.channel,
        lastMessageAt: inboxConversationsTable.lastMessageAt,
        contentId: inboxConversationsTable.contentId,
        externalThreadId: inboxConversationsTable.externalThreadId,
        contactId: inboxContactsTable.id,
        contactName: inboxContactsTable.name,
        contactProfilePicUrl: inboxContactsTable.profilePicUrl,
        caId: connectedAccount.id,
        caName: connectedAccount.accountName,
        contentPlacementSpec: unifiedContentTable.placementSpec,
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
      .leftJoin(
        unifiedContentTable,
        eq(inboxConversationsTable.contentId, unifiedContentTable.id),
      )
      .where(
        and(
          eq(inboxConversationsTable.id, conversationId),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!row) return c.notFound();

    const postPreview = row.contentPlacementSpec
      ? placementSpecToContentPreview(row.contentPlacementSpec)
      : undefined;

    const data = InboxConversationSummarySchema.parse({
      id: row.id,
      platform: row.platform,
      channel: row.channel,
      lastMessageAt: row.lastMessageAt,
      contact: {
        id: row.contactId,
        name: row.contactName,
        profilePicUrl: row.contactProfilePicUrl,
      },
      connectedAccount: { id: row.caId, accountName: row.caName },
      contentId: row.contentId,
      externalThreadId: row.externalThreadId,
      postPreview,
    });
    return c.json(data);
  },
);
