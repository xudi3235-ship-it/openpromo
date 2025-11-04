import { InboxReplyService } from "@core/domain/inbox/reply-service";
import type { ApiEnv } from "@core/helpers/api-env";
import { InboxAttachment } from "@shared/inbox";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const sendMessageBody = z
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
  });

export const inboxPostMessageRoute = new Hono<ApiEnv>().post(
  "/:conversationId/messages",
  zValidator("json", sendMessageBody),
  async (c) => {
    const { conversationId } = c.req.param();
    const payload = c.req.valid("json");
    const text = payload.text?.trim() ?? "";
    const attachments = payload.attachments ?? [];
    const replyToMessageId = payload.replyToMessageId ?? null;

    await InboxReplyService.sendReply({
      conversationId,
      text,
      attachments,
      replyToMessageId,
    });

    return c.json({ ok: true });
  },
);
