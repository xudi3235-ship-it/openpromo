import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { handleInstagramCommentChanges } from "@core/domain/inbox/webhooks/instagram-comments";
import { handleInstagramDMEvents } from "@core/domain/inbox/webhooks/instagram-dm";
import { handleInstagramMessageChanges } from "@core/domain/inbox/webhooks/instagram-message-changes";
import type { ApiEnv } from "@core/helpers/api-env";
import { env } from "@core/utils/env";
import type { IGWebhookPayload } from "@shared/inbox";
import { Hono } from "hono";
import { createVisibleError } from "../../helpers/error";
import { verifyMetaWebhookSignature } from "../../middleware/verify-meta-webhook-signature";
import { zValidator } from "../../middleware/zod-validator";
import { metaWebhookGetQuerySchema } from "./common";

export const instagramWebhooksRoute = new Hono<ApiEnv>()
  // GET /webhooks/instagram - this is used by instagram to verify the webhook endpoint
  .get("/", zValidator("query", metaWebhookGetQuerySchema), (c) => {
    const { "hub.challenge": challenge, "hub.verify_token": verifyToken } =
      c.req.valid("query");

    if (verifyToken !== env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      throw createVisibleError(400, {
        message: "Invalid instagram webhook verify token",
        userMessage: "Webhook verification failed.",
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
        console.log("[IG Webhook] Received webhook", {
          object: body.object,
          entryCount: body.entry?.length ?? 0,
          fullBody: JSON.stringify(body, null, 2),
        });

        if (body.object !== "instagram") {
          return c.status(404);
        }
        for (const entry of body.entry) {
          const { id: igAccountId } = entry;
          console.log("[IG Webhook] Processing entry", {
            igAccountId,
            hasMessaging: !!entry.messaging,
            messagingCount: entry.messaging?.length ?? 0,
            hasChanges: !!entry.changes,
            changesCount: entry.changes?.length ?? 0,
          });

          // 1. Resolve connected account
          const account = await ConnectedAccount.fromIGAccountID(igAccountId, {
            skipWorkspaceCheck: true,
          });

          // 2. Handle DM events (messaging array)
          if (entry.messaging && entry.messaging.length > 0) {
            console.log("[IG Webhook] Handling messaging events", {
              accountId: account.id,
              count: entry.messaging.length,
            });
            await handleInstagramDMEvents(entry.messaging, account);
          }

          // 3. Handle comment and message change events (changes array)
          if ("changes" in entry && Array.isArray(entry.changes)) {
            const changes = entry.changes ?? [];
            console.log("[IG Webhook] Processing changes", {
              accountId: account.id,
              changesCount: changes.length,
              changeFields: changes.map((c: { field?: string }) => c.field),
              rawChanges: JSON.stringify(changes, null, 2),
            });

            const commentChanges = changes.filter(
              (change) => change.field === "comments",
            );
            if (commentChanges.length > 0) {
              console.log("[IG Webhook] Handling comment changes", {
                accountId: account.id,
                count: commentChanges.length,
              });
              await handleInstagramCommentChanges(commentChanges, account);
            }

            const messageChanges = changes.filter(
              (change) =>
                change.field === "message_edit" ||
                change.field === "message_reactions",
            );
            if (messageChanges.length > 0) {
              console.log("[IG Webhook] Handling message changes", {
                accountId: account.id,
                count: messageChanges.length,
                fields: messageChanges.map((c: { field?: string }) => c.field),
                rawMessageChanges: JSON.stringify(messageChanges, null, 2),
              });
              await handleInstagramMessageChanges(messageChanges, account);
            } else {
              console.log("[IG Webhook] No message changes found", {
                accountId: account.id,
                allChangeFields: changes.map(
                  (c: { field?: string }) => c.field,
                ),
              });
            }
          } else {
            console.log("[IG Webhook] No changes array in entry", {
              accountId: account.id,
              entryKeys: Object.keys(entry),
            });
          }
        }
        return c.status(200);
      } catch (error) {
        console.error("[IG Webhook] Error processing webhook", error);
        return c.status(500);
      }
    },
  );
