import type { ApiEnv } from "@core/helpers/api-env";
import { env } from "@core/utils/env";
import { Hono } from "hono";
import { AppError } from "../../helpers/error";
import { verifyMetaWebhookSignature } from "../../middleware/verify-meta-webhook-signature";
import { zValidator } from "../../middleware/zod-validator";
import { metaWebhookGetQuerySchema } from "./common";

export const instagramWebhooksRoute = new Hono<ApiEnv>()
  // GET /webhooks/instagram - this is used by instagram to verify the webhook endpoint
  .get("/", zValidator("query", metaWebhookGetQuerySchema), (c) => {
    const { "hub.challenge": challenge, "hub.verify_token": verifyToken } =
      c.req.valid("query");

    if (verifyToken !== env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      throw new AppError(400, {
        message: "Invalid facebook webhook verify token",
      });
    }

    return c.text(challenge);
  })
  // POST /webhooks/instagram - this is used by instagram to send webhook events
  .post("/", verifyMetaWebhookSignature(env.INSTAGRAM_APP_SECRET), (c) => {
    // TODO: handle webhook events
    return c.text("ok");
  });
