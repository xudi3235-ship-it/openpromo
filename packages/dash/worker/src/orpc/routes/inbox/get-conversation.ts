import { getDbClient } from "@core/database/db";
import {
  getNotesCount,
  readCollabMetadata,
} from "@core/domain/inbox/collab-metadata";
import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { placementSpecToContentPreview } from "@shared/content/content-preview";
import { InboxConversationSummarySchema } from "@shared/inbox";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const GetConversationInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1),
  }),
);

export const getConversation = orpcBuilder
  .input(GetConversationInput)
  .output(InboxConversationSummarySchema)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;
    const db = getDbClient();
    const { conversationId } = input;

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

    if (!row) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );
    }

    const postPreview = row.contentPlacementSpec
      ? placementSpecToContentPreview(row.contentPlacementSpec, {
          accountName: row.caName,
          profilePicUrl: row.caProfilePicUrl,
          permalink: null,
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

    return InboxConversationSummarySchema.parse({
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
  });
