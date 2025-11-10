import { getDbClient } from "@core/database/db";
import {
  getNotesCount,
  readCollabMetadata,
} from "@core/domain/inbox/collab-metadata";
import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { AllPlatforms } from "@shared/content";
import { InboxConversationSummarySchema } from "@shared/inbox";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import type { InboxConversationsList } from "../../../inbox/types";
import { InboxConversationsListSchema } from "../../../inbox/types";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const ListConversationsInput = createWorkspaceInputSchema(
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
    q: z.string().min(1).max(200).optional(),
    platform: z.enum([...Object.values(AllPlatforms)]).optional(),
    connectedAccountId: z.string().optional(),
    channel: z.enum(["dm", "post_comment"]).optional(),
    unread: z.boolean().optional(),
  }),
);

export const listConversations = orpcBuilder
  .input(ListConversationsInput)
  .output(InboxConversationsListSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }): Promise<InboxConversationsList> => {
    const { page, pageSize, q, platform, connectedAccountId, channel, unread } =
      input;
    const workspaceId = context.workspace.workspaceID;
    const db = getDbClient();

    const where = [eq(connectedAccount.workspaceId, workspaceId)];
    if (platform) where.push(eq(inboxConversationsTable.platform, platform));
    if (channel) where.push(eq(inboxConversationsTable.channel, channel));
    if (connectedAccountId)
      where.push(
        eq(inboxConversationsTable.connectedAccountId, connectedAccountId),
      );
    if (q) {
      const sanitized = q.replace(/[%_]/g, "\\$&");
      where.push(ilike(inboxContactsTable.name, `%${sanitized}%`));
    }

    const totalRes = await db
      .select({ count: count() })
      .from(inboxConversationsTable)
      .innerJoin(
        connectedAccount,
        eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
      )
      .innerJoin(
        inboxContactsTable,
        eq(inboxConversationsTable.contactId, inboxContactsTable.id),
      )
      .where(and(...where));
    const total = totalRes[0]?.count ?? 0;

    const rows = await db
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
      .where(and(...where))
      .orderBy(desc(inboxConversationsTable.lastMessageAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows
      .map((row) => {
        const collab = readCollabMetadata(row.metadata);
        const { isUnread, lastReadAt } = computeUnreadStatus({
          lastMessageAt: row.lastMessageAt,
          metadata: row.metadata,
          platform: row.platform,
          channel: row.channel,
        });
        const notesCount = getNotesCount(collab);

        return {
          row,
          collab,
          isUnread,
          lastReadAt,
          notesCount,
        };
      })
      .filter((entry) => {
        if (unread === undefined) return true;
        return entry.isUnread === unread;
      })
      .map((entry) =>
        InboxConversationSummarySchema.parse({
          id: entry.row.id,
          platform: entry.row.platform,
          channel: entry.row.channel,
          lastMessageAt: entry.row.lastMessageAt,
          contact: {
            id: entry.row.contactId,
            name: entry.row.contactName,
            profilePicUrl: entry.row.contactProfilePicUrl,
          },
          connectedAccount: {
            id: entry.row.caId,
            accountName: entry.row.caName,
            profilePicUrl: entry.row.caProfilePicUrl,
          },
          contentId: entry.row.contentId,
          externalThreadId: entry.row.externalThreadId,
          isUnread: entry.isUnread,
          lastReadAt: entry.lastReadAt,
          collab: entry.collab ?? undefined,
          notesCount: entry.notesCount ?? 0,
        }),
      );

    return {
      items,
      page,
      pageSize,
      total,
    };
  });
