import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { handleFacebookCommentChanges } from "@core/domain/inbox/webhooks/facebook-comment";
import { handleFacebookDMEvents } from "@core/domain/inbox/webhooks/facebook-dm";
import type { ApiEnv } from "@core/helpers/api-env";
import { env } from "@core/utils/env";
import type { FBWebhookPayload } from "@shared/inbox";
import { Hono } from "hono";
import { createVisibleError } from "../../helpers/error";
import { verifyMetaWebhookSignature } from "../../middleware/verify-meta-webhook-signature";
import { zValidator } from "../../middleware/zod-validator";
import { metaWebhookGetQuerySchema } from "./common";

export const facebookWebhooksRoute = new Hono<ApiEnv>()
  // GET /webhooks/facebook - this is used by facebook to verify the webhook endpoint
  .get("/", zValidator("query", metaWebhookGetQuerySchema), (c) => {
    const { "hub.challenge": challenge, "hub.verify_token": verifyToken } =
      c.req.valid("query");

    if (verifyToken !== env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      throw createVisibleError(400, {
        message: "Invalid facebook webhook verify token",
        userMessage: "Webhook verification failed.",
      });
    }

    return c.text(challenge);
  })
  // POST /webhooks/facebook - this is used by facebook to send webhook events
  .post("/", verifyMetaWebhookSignature(env.FACEBOOK_APP_SECRET), async (c) => {
    try {
      const body = (await c.req.json()) as FBWebhookPayload;
      if (body.object !== "page") {
        // Return 404 if event is not from a page subscription
        return c.status(404);
      }
      for (const entry of body.entry) {
        const { id: pageId } = entry;
        // 1. Resolve connected account
        const account = await ConnectedAccount.fromFBPageID(pageId, {
          skipWorkspaceCheck: true,
        });

        // Handle DM messages
        if ("messaging" in entry) {
          await handleFacebookDMEvents(entry.messaging, account);
        }

        // Handle feed comment changes
        if ("changes" in entry) {
          await handleFacebookCommentChanges(
            entry.changes
              .filter((change) => change.field === "feed")
              .map((change) => change.value),
            account,
          );
        }
      }
      return c.status(200);
    } catch (error) {
      console.error(error);
      return c.status(500);
    }
  });
