import { InboxReactionService } from "@core/domain/inbox/reaction-service";
import { z } from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const RemoveReactionInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1, "Conversation ID is required"),
    messageId: z.string().min(1, "Message ID is required"),
    emoji: z.string().min(1, "Emoji is required").max(10, "Emoji too long"),
  }),
);

const RemoveReactionOutput = z.object({
  ok: z.literal(true),
});

export const removeReaction = orpcBuilder
  .input(RemoveReactionInput)
  .output(RemoveReactionOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const { conversationId, messageId, emoji } = input;

    await InboxReactionService.removeReaction({
      workspaceId: context.workspace.workspaceID,
      conversationId,
      messageId,
      emoji,
    });

    return { ok: true as const };
  });
