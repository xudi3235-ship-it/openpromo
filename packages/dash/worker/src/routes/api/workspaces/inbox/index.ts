import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import {
  InboxConversationSummarySchema,
  InboxMessageSchema,
  InboxPlatform,
} from "@shared/inbox";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const listConversationsQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(25),
  q: z.string().min(1).max(200).optional(),
  platform: InboxPlatform.optional(),
  connectedAccountId: z.string().optional(),
});

const listMessagesQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(200).default(50),
});

const sendMessageBody = z.object({
  text: z.string().min(1).max(1000),
});

export const inboxRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_viewer"))
  // GET /inbox/conversations
  .get(
    "/conversations",
    zValidator("query", listConversationsQuery),
    async (c) => {
      const db = getDbClient();
      const { page, pageSize, q, platform, connectedAccountId } =
        c.req.valid("query");

      const workspaceId = Actor.workspaceID();

      const where = [eq(connectedAccount.workspaceId, workspaceId)];
      if (platform) where.push(eq(inboxConversationsTable.platform, platform));
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
          lastMessageAt: inboxConversationsTable.lastMessageAt,
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

      const items = rows.map((r) =>
        InboxConversationSummarySchema.parse({
          id: r.id,
          platform: r.platform,
          lastMessageAt: r.lastMessageAt,
          contact: {
            id: r.contactId,
            name: r.contactName,
            profilePicUrl: r.contactProfilePicUrl,
          },
          connectedAccount: { id: r.caId, accountName: r.caName },
        }),
      );

      return c.json({ items, page, pageSize, total });
    },
  )
  // GET /inbox/conversations/:conversationId
  .get("/conversations/:conversationId", async (c) => {
    const db = getDbClient();
    const { conversationId } = c.req.param();
    const workspaceId = Actor.workspaceID();

    const [row] = await db
      .select({
        id: inboxConversationsTable.id,
        platform: inboxConversationsTable.platform,
        lastMessageAt: inboxConversationsTable.lastMessageAt,
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
      .where(
        and(
          eq(inboxConversationsTable.id, conversationId),
          eq(connectedAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!row) return c.notFound();

    const data = InboxConversationSummarySchema.parse({
      id: row.id,
      platform: row.platform,
      lastMessageAt: row.lastMessageAt,
      contact: {
        id: row.contactId,
        name: row.contactName,
        profilePicUrl: row.contactProfilePicUrl,
      },
      connectedAccount: { id: row.caId, accountName: row.caName },
    });
    return c.json(data);
  })
  // GET /inbox/conversations/:conversationId/messages
  .get(
    "/conversations/:conversationId/messages",
    zValidator("query", listMessagesQuery),
    async (c) => {
      const db = getDbClient();
      const { conversationId } = c.req.param();
      const { page, pageSize } = c.req.valid("query");
      const workspaceId = Actor.workspaceID();

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
        .orderBy(
          desc(inboxMessagesTable.createdAt),
          desc(inboxMessagesTable.id),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const items = rows.map((r) =>
        InboxMessageSchema.parse({
          id: r.id,
          externalId: r.externalId,
          sender: r.sender,
          text: r.text ?? null,
          attachments: r.attachments,
          createdAt: r.createdAt,
        }),
      );

      return c.json({ items, page, pageSize, total });
    },
  )
  // POST /inbox/conversations/:conversationId/messages
  .post(
    "/conversations/:conversationId/messages",
    withWorkspaceRole("workspace_editor"),
    zValidator("json", sendMessageBody),
    async (c) => {
      const db = getDbClient();
      const { conversationId } = c.req.param();
      const { text } = c.req.valid("json");
      const workspaceId = Actor.workspaceID();

      const [row] = await db
        .select({
          platform: inboxConversationsTable.platform,
          externalId: inboxContactsTable.externalId,
          accessToken: connectedAccount.encryptedAccessToken,
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
        .where(
          and(
            eq(inboxConversationsTable.id, conversationId),
            eq(connectedAccount.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!row) return c.notFound();

      if (row.platform === "INSTAGRAM") {
        await instagramGraphRequest(
          { accessToken: row.accessToken },
          `/me/messages`,
          {
            method: "POST",
            body: {
              recipient: { id: row.externalId },
              message: { text },
            },
          },
        );
      } else if (row.platform === "FACEBOOK") {
        await facebookGraphRequest(
          { accessToken: row.accessToken },
          "/me/messages",
          {
            method: "POST",
            body: {
              recipient: { id: row.externalId },
              messaging_type: "RESPONSE",
              message: { text },
            },
          },
        );
      }

      // Do not insert; message will echoed back by and handled by webhook
      return c.json({ ok: true });
    },
  );

export type InboxConversationsList = {
  items: z.infer<typeof InboxConversationSummarySchema>[];
  page: number;
  pageSize: number;
  total: number;
};

export type InboxMessagesList = {
  items: z.infer<typeof InboxMessageSchema>[];
  page: number;
  pageSize: number;
  total: number;
};
