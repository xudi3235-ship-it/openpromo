import { getDbClient } from "@core/database/db";
import {
  getNotesCount,
  readCollabMetadata,
} from "@core/domain/inbox/collab-metadata";
import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { AllPlatforms } from "@shared/content";
import { InboxConversationSummarySchema } from "@shared/inbox";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const listConversationsQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(25),
  q: z.string().min(1).max(200).optional(),
  platform: z.enum([...Object.values(AllPlatforms)]).optional(),
  connectedAccountId: z.string().optional(),
  channel: z.enum(["dm", "post_comment"]).optional(),
  unread: z.coerce.boolean().optional(),
});

export const inboxGetConversationsRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", listConversationsQuery),
  async (c) => {
    const db = getDbClient();
    const { page, pageSize, q, platform, connectedAccountId, channel, unread } =
      c.req.valid("query");

    const workspaceId = Actor.workspaceID();

    const where = [eq(connectedAccount.workspaceId, workspaceId)];
    if (platform) where.push(eq(inboxConversationsTable.platform, platform));
    if (channel) where.push(eq(inboxConversationsTable.channel, channel));
    if (connectedAccountId)
      where.push(
        eq(inboxConversationsTable.connectedAccountId, connectedAccountId),
      );
    if (q)
      where.push(
        ilike(inboxContactsTable.name, `%${q.replace(/[%_]/g, "\\$&")}%`),
      );

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
      .map((r) => {
        const collab = readCollabMetadata(r.metadata);
        const { isUnread, lastReadAt } = computeUnreadStatus({
          lastMessageAt: r.lastMessageAt,
          metadata: r.metadata,
          platform: r.platform,
          channel: r.channel,
        });
        const notesCount = getNotesCount(collab);

        return {
          ...r,
          isUnread,
          lastReadAt,
          collab,
          notesCount,
        };
      })
      .filter((item) => {
        // Apply unread filter if specified
        if (unread !== undefined) {
          return item.isUnread === unread;
        }
        return true;
      })
      .map((r) =>
        InboxConversationSummarySchema.parse({
          id: r.id,
          platform: r.platform,
          channel: r.channel,
          lastMessageAt: r.lastMessageAt,
          contact: {
            id: r.contactId,
            name: r.contactName,
            profilePicUrl: r.contactProfilePicUrl,
          },
          connectedAccount: { id: r.caId, accountName: r.caName },
          contentId: r.contentId,
          externalThreadId: r.externalThreadId,
          isUnread: r.isUnread,
          lastReadAt: r.lastReadAt,
          collab: r.collab ?? undefined,
          notesCount: r.notesCount ?? 0,
        }),
      );

    return c.json({ items, page, pageSize, total });
  },
);
