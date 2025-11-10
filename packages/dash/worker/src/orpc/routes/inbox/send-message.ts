import { InboxReplyService } from "@core/domain/inbox/reply-service";
import { InboxAttachment } from "@shared/inbox";
import { z } from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const SendMessageInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1),
    body: z
      .object({
        text: z.string().max(1000).optional(),
        attachments: z.array(InboxAttachment).max(1).optional().default([]),
        replyToMessageId: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        const hasText =
          typeof data.text === "string" && data.text.trim().length > 0;
        const hasAttachments =
          Array.isArray(data.attachments) && data.attachments.length > 0;

        if (!hasText && !hasAttachments) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Message must include text or at least one attachment.",
            path: ["text"],
          });
        }
      }),
  }),
);

const SendMessageOutput = z.object({
  ok: z.literal(true),
});

export const sendMessage = orpcBuilder
  .input(SendMessageInput)
  .output(SendMessageOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { conversationId, body } = input;
    const text = body.text?.trim() ?? "";
    const attachments = body.attachments ?? [];
    const replyToMessageId = body.replyToMessageId ?? null;

    await InboxReplyService.sendReply({
      conversationId,
      text,
      attachments,
      replyToMessageId,
    });

    return { ok: true as const };
  });
