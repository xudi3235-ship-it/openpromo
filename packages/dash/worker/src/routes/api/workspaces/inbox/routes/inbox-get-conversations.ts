import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { env } from "@core/utils/env";
import { AllPlatforms } from "@shared/content";
import { placementSpecToContentPreview } from "@shared/content/content-preview";
import { InboxConversationSummarySchema } from "@shared/inbox";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";
import { mockConversations } from "../mock";

const listConversationsQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(25),
  q: z.string().min(1).max(200).optional(),
  platform: z.enum([...Object.values(AllPlatforms)]).optional(),
  connectedAccountId: z.string().optional(),
  channel: z.enum(["dm", "post_comment"]).optional(),
});

export const inboxGetConversationsRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", listConversationsQuery),
  async (c) => {
    const db = getDbClient();
    const { page, pageSize, q, platform, connectedAccountId, channel } =
      c.req.valid("query");

    const workspaceId = Actor.workspaceID();

    if (env.VITE_ENVIRONMENT === "local") {
      const filtered = mockConversations.filter((conversation) => {
        if (platform && conversation.platform !== platform) return false;
        if (channel && conversation.channel !== channel) return false;
        if (
          connectedAccountId &&
          conversation.connectedAccount.id !== connectedAccountId
        )
          return false;
        if (q) {
          const needle = q.trim().toLowerCase();
          const haystack = [
            conversation.contact.name,
            conversation.connectedAccount.accountName ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
        }
        return true;
      });

      const sorted = filtered.sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
      );
      const start = (page - 1) * pageSize;
      const items = sorted.slice(start, start + pageSize);

      return c.json({
        items,
        page,
        pageSize,
        total: filtered.length,
      });
    }

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
      .leftJoin(
        unifiedContentTable,
        eq(inboxConversationsTable.contentId, unifiedContentTable.id),
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
      .where(and(...where))
      .orderBy(desc(inboxConversationsTable.lastMessageAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map((r) => {
      const postPreview = r.contentPlacementSpec
        ? placementSpecToContentPreview(
            r.contentPlacementSpec as Parameters<
              typeof placementSpecToContentPreview
            >[0],
          )
        : undefined;

      return InboxConversationSummarySchema.parse({
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
        postPreview,
      });
    });

    return c.json({ items, page, pageSize, total });
  },
);
