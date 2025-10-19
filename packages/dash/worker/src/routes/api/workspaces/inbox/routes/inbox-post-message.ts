import {
  FacebookGraphError,
  facebookGraphRequest,
} from "@core/domain/content/entity/facebook/api";
import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { env } from "@core/utils/env";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../../helpers/error";
import { zValidator } from "../../../../../middleware/zod-validator";

const sendMessageBody = z.object({
  text: z.string().min(1).max(1000),
});

export const inboxPostMessageRoute = new Hono<ApiEnv>().post(
  "/:conversationId/messages",
  zValidator("json", sendMessageBody),
  async (c) => {
    if (env.VITE_ENVIRONMENT === "local") {
      return c.json({ ok: true });
    }
    const db = getDbClient();
    const { conversationId } = c.req.param();
    const { text } = c.req.valid("json");
    const workspaceId = Actor.workspaceID();

    const [row] = await db
      .select({
        platform: inboxConversationsTable.platform,
        externalId: inboxContactsTable.externalId,
        accessToken: connectedAccount.encryptedAccessToken,
        connectedAccountId: connectedAccount.id,
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

    try {
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
          {
            accessToken: row.accessToken,
            rateLimitKey: `facebook:${row.connectedAccountId}`,
          },
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
    } catch (error: unknown) {
      if (error instanceof FacebookGraphError) {
        throw new AppError(400, { userMessage: error.message });
      }
      throw error;
    }

    // Do not insert; message will echoed back by and handled by webhook
    return c.json({ ok: true });
  },
);
