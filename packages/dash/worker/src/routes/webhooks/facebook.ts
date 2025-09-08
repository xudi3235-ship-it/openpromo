import type { ApiEnv } from "@core/helpers/api-env";
import { env } from "@core/utils/env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../helpers/error";
import { verifyMetaWebhookSignature } from "../../middleware/verify-meta-webhook-signature";
import { zValidator } from "../../middleware/zod-validator";

const facebookWebhookGetQuerySchema = z.object({
  "hub.mode": z.literal("subscribe"),
  "hub.challenge": z.string(),
  "hub.verify_token": z.string(),
});

export const facebookWebhooksRoute = new Hono<ApiEnv>()
  // GET /webhooks/facebook - this is used by facebook to verify the webhook endpoint
  .get("/", zValidator("query", facebookWebhookGetQuerySchema), (c) => {
    const { "hub.challenge": challenge, "hub.verify_token": verifyToken } =
      c.req.valid("query");

    if (verifyToken !== env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      throw new AppError(400, {
        message: "Invalid facebook webhook verify token",
      });
    }

    return c.text(challenge);
  })
  // POST /webhooks/facebook - this is used by facebook to send webhook events
  .post("/", verifyMetaWebhookSignature(env.FACEBOOK_APP_SECRET), (c) => {
    // TODO: handle webhook events
    return c.text("ok");
  });
