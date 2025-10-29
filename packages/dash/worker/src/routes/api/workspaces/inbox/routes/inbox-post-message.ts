import { InboxReplyService } from "@core/domain/inbox/reply-service";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const sendMessageBody = z.object({
  text: z.string().min(1).max(1000),
});

export const inboxPostMessageRoute = new Hono<ApiEnv>().post(
  "/:conversationId/messages",
  zValidator("json", sendMessageBody),
  async (c) => {
    const { conversationId } = c.req.param();
    const { text } = c.req.valid("json");

    await InboxReplyService.sendReply({
      conversationId,
      text,
    });

    return c.json({ ok: true });
  },
);
