import { getDbClient } from "@core/database/db";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { loadConversationForWorkspace } from "../../routes/api/workspaces/inbox/routes/utils/conversation-loader";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const DeleteConversationInputSchema = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1),
  }),
);

const DeleteConversationOutputSchema = z.object({
  success: z.boolean(),
  conversationId: z.string(),
});

export const deleteConversation = orpcBuilder
  .input(DeleteConversationInputSchema)
  .output(DeleteConversationOutputSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
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
