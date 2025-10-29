import { InboxReplyService } from "@core/domain/inbox/reply-service";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const sendMessageBody = z.object({
  text: z.string().min(1).max(1000),
  replyToMessageId: z.string().optional(),
});

export const inboxPostMessageRoute = new Hono<ApiEnv>().post(
  "/:conversationId/messages",
  zValidator("json", sendMessageBody),
  async (c) => {
    const { conversationId } = c.req.param();
    const { text, replyToMessageId } = c.req.valid("json");

    await InboxReplyService.sendReply({
      conversationId,
      text,
      replyToMessageId: replyToMessageId ?? null,
    });

    return c.json({ ok: true });
  },
);
