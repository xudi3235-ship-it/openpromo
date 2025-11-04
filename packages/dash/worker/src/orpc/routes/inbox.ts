import { getDbClient } from "@core/database/db";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { loadConversationForWorkspace } from "../../routes/api/workspaces/inbox/routes/utils/conversation-loader";
import { orpcBuilder, withWorkspaceRole } from "../context";

const DeleteConversationInputSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  workspaceSlug: z.string().min(1).optional(),
  conversationId: z.string().min(1),
});

export const deleteConversation = orpcBuilder
  .input(DeleteConversationInputSchema)
  .use(withWorkspaceRole, (input) => ({
    requiredRole: WORKSPACE_ROLE.EDITOR,
    workspaceId: input.workspaceId,
    workspaceSlug: input.workspaceSlug,
  }))
  .handler(async ({ input, context }) => {
    const { conversationId } = input;
    const workspaceId = context.workspace.workspaceID;
    const db = getDbClient();

    // Actor context is already provided by the middleware
    const conversation = await loadConversationForWorkspace(
      db,
      conversationId,
      workspaceId,
    );

    if (!conversation)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );

    await db
      .delete(inboxConversationsTable)
      .where(eq(inboxConversationsTable.id, conversation.id));

    return { success: true, conversationId };
  });

export const inboxRouter = {
  deleteConversation,
};
