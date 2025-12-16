import { InboxReactionService } from "@core/domain/inbox/reaction-service";
import { z } from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const AddReactionInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1, "Conversation ID is required"),
    messageId: z.string().min(1, "Message ID is required"),
    emoji: z.string().min(1, "Emoji is required").max(10, "Emoji too long"),
  }),
);

const AddReactionOutput = z.object({
  ok: z.literal(true),
});

export const addReaction = orpcBuilder
  .input(AddReactionInput)
  .output(AddReactionOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const { conversationId, messageId, emoji } = input;

    await InboxReactionService.addReaction({
      workspaceId: context.workspace.workspaceID,
      conversationId,
      messageId,
      emoji,
    });

    return { ok: true as const };
  });
