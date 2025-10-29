import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { handleInstagramCommentChanges } from "@core/domain/inbox/webhooks/instagram-comments";
import { handleInstagramDMEvents } from "@core/domain/inbox/webhooks/instagram-dm";
import { handleInstagramMessageChanges } from "@core/domain/inbox/webhooks/instagram-message-changes";
import type { ApiEnv } from "@core/helpers/api-env";
import { env } from "@core/utils/env";
import type { IGWebhookPayload } from "@shared/inbox";
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
  .post(
    "/",
    verifyMetaWebhookSignature(env.INSTAGRAM_APP_SECRET),
    async (c) => {
      try {
        const body = (await c.req.json()) as IGWebhookPayload;
        if (body.object !== "instagram") {
          return c.status(404);
        }
        for (const entry of body.entry) {
          const { id: igAccountId } = entry;
          // 1. Resolve connected account
          const account = await ConnectedAccount.fromIGAccountID(igAccountId, {
            skipWorkspaceCheck: true,
          });

          // 2. Handle DM events
          if (entry.messaging && entry.messaging.length > 0) {
            await handleInstagramDMEvents(entry.messaging, account);
          }

          // 3. Handle comment and message change events
          if ("changes" in entry && Array.isArray(entry.changes)) {
            const changes = entry.changes ?? [];
            const commentChanges = changes.filter(
              (change) => change.field === "comments",
            );
            if (commentChanges.length > 0) {
              await handleInstagramCommentChanges(commentChanges, account);
            }
            const messageChanges = changes.filter(
              (change) =>
                change.field === "message_edit" ||
                change.field === "message_reactions",
            );
            if (messageChanges.length > 0) {
              await handleInstagramMessageChanges(messageChanges, account);
            }
          }
        }
        return c.status(200);
      } catch (error) {
        console.error(error);
        return c.status(500);
      }
    },
  );
