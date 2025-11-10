import { getDbClient } from "@core/database/db";
import { computeUnreadStatus } from "@core/domain/inbox/unread-helper";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const GetUnreadCountInput = createWorkspaceInputSchema(z.object({}));

const GetUnreadCountOutput = z.object({
  unreadCount: z.number(),
});

export const getUnreadCount = orpcBuilder
  .input(GetUnreadCountInput)
  .output(GetUnreadCountOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ context }) => {
    const workspaceId = context.workspace.workspaceID;
    const db = getDbClient();

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

    const unreadCount = rows.filter((row) => {
      const { isUnread } = computeUnreadStatus({
        lastMessageAt: row.lastMessageAt,
        metadata: row.metadata,
        platform: row.platform,
        channel: row.channel,
      });
      return isUnread;
    }).length;

    return { unreadCount };
  });
