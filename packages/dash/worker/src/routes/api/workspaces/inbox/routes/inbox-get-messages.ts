import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import { env } from "@core/utils/env";
import { InboxMessageSchema } from "@shared/inbox";
import { and, count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";
import { mockMessages } from "../mock";

const listMessagesQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(200).default(50),
});

export const inboxGetMessagesRoute = new Hono<ApiEnv>().get(
  "/:conversationId/messages",
  zValidator("query", listMessagesQuery),
  async (c) => {
    const { conversationId } = c.req.param();
    const { page, pageSize } = c.req.valid("query");
    const workspaceId = Actor.workspaceID();

    if (env.VITE_ENVIRONMENT === "local") {
      const thread = mockMessages[conversationId] ?? [];
      const sorted = [...thread].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const start = (page - 1) * pageSize;
      const items = sorted.slice(start, start + pageSize);

      return c.json({
        items,
        page,
        pageSize,
        total: thread.length,
      });
    }

    const db = getDbClient();
    // Ensure conversation belongs to this workspace
    const [conv] = await db
      .select({ id: inboxConversationsTable.id })
      .from(inboxConversationsTable)
      .innerJoin(
        connectedAccount,
        eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
      )
      .where(
        and(
          eq(inboxConversationsTable.id, conversationId),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!conv) return c.notFound();

    const totalRes = await db
      .select({ count: count() })
      .from(inboxMessagesTable)
      .where(eq(inboxMessagesTable.inboxConversationId, conversationId));
    const total = totalRes[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(inboxMessagesTable)
      .where(eq(inboxMessagesTable.inboxConversationId, conversationId))
      .orderBy(desc(inboxMessagesTable.createdAt), desc(inboxMessagesTable.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map((r) =>
      InboxMessageSchema.parse({
        id: r.id,
        externalId: r.externalId,
        sender: r.sender,
        channel: r.channel,
        text: r.text ?? null,
        attachments: r.attachments,
        createdAt: r.createdAt,
        contentId: r.contentId,
        metadata: r.metadata ?? {},
      }),
    );

    return c.json({ items, page, pageSize, total });
  },
);
