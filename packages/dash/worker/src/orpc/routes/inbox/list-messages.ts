import { getDbClient } from "@core/database/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { InboxMessageSchema } from "@shared/inbox";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { InboxMessagesList } from "../../../inbox/types";
import { InboxMessagesListSchema } from "../../../inbox/types";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const ListMessagesInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
  }),
);

export const listMessages = orpcBuilder
  .input(ListMessagesInput)
  .output(InboxMessagesListSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }): Promise<InboxMessagesList> => {
    const workspaceId = context.workspace.workspaceID;
    const { conversationId, page, pageSize } = input;
    const db = getDbClient();

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

    if (!conv) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );
    }

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

    return { items, page, pageSize, total };
  });
