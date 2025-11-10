import { getDbClient } from "@core/database/db";
import {
  getNotesCount,
  readCollabMetadata,
} from "@core/domain/inbox/collab-metadata";
import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
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
        metadata: inboxConversationsTable.metadata,
        contactId: inboxContactsTable.id,
        contactName: inboxContactsTable.name,
        contactProfilePicUrl: inboxContactsTable.profilePicUrl,
        caId: connectedAccount.id,
        caName: connectedAccount.accountName,
        caProfilePicUrl: connectedAccount.profilePicUrl,
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

    console.log("[inbox get conversation]", row.contentPlacementSpec);

    const postPreview = row.contentPlacementSpec
      ? placementSpecToContentPreview(row.contentPlacementSpec, {
          accountName: row.caName,
          profilePicUrl: row.caProfilePicUrl,
          permalink: null, // TODO: construct permalink from metadata if available
          timestampLabel: null,
        })
      : undefined;

    const { isUnread, lastReadAt } = computeUnreadStatus({
      lastMessageAt: row.lastMessageAt,
      metadata: row.metadata,
      platform: row.platform,
      channel: row.channel,
    });
    const collab = readCollabMetadata(row.metadata);
    const notesCount = getNotesCount(collab);

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
      connectedAccount: {
        id: row.caId,
        accountName: row.caName,
        profilePicUrl: row.caProfilePicUrl,
      },
      contentId: row.contentId,
      externalThreadId: row.externalThreadId,
      postPreview,
      isUnread,
      lastReadAt,
      collab: collab ?? undefined,
      notesCount,
    });
    return c.json(data);
  },
);
