import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { facebookOAuthService } from "@core/domain/connected-account/facebook";
import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import type { ApiEnv } from "@core/helpers/api-env";
import { Platform } from "@core/schemas/connected-account.sql";
import { env } from "@core/utils/env";
import {
  type FBWebhookPayload,
  type InboxRealtimeEvent,
  InboxRealtimeEventTypes,
} from "@shared/inbox";
import { Hono } from "hono";
import { AppError } from "../../helpers/error";
import { verifyMetaWebhookSignature } from "../../middleware/verify-meta-webhook-signature";
import { zValidator } from "../../middleware/zod-validator";
import { metaWebhookGetQuerySchema } from "./common";

export const facebookWebhooksRoute = new Hono<ApiEnv>()
  // GET /webhooks/facebook - this is used by facebook to verify the webhook endpoint
  .get("/", zValidator("query", metaWebhookGetQuerySchema), (c) => {
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
        for (const messaging of entry.messaging) {
          const { sender, recipient, message, message_edit, timestamp } =
            messaging;
          if (!message && !message_edit) continue;

          const contactExternalId = message?.is_echo ? recipient.id : sender.id;
          // 2. Resolve existing contact or fetch profile; error if neither
          let contact = await InboxService.findContact({
            platform: Platform.enum.FACEBOOK,
            externalId: contactExternalId,
          });
          if (!contact) {
            const profile = await facebookOAuthService.getUserProfile(
              account.encryptedAccessToken,
              contactExternalId,
            );

            contact = await InboxService.createContact({
              platform: Platform.enum.FACEBOOK,
              externalId: contactExternalId,
              name: profile.name,
              profilePicUrl: profile.picture.data.url,
            });
          }
          // 3. Get or upsert conversation
          const conversation = message_edit
            ? await InboxService.getConversation({
                connectedAccountId: account.id,
                contactId: contact.id,
              })
            : await InboxService.upsertConversation({
                connectedAccountId: account.id,
                platform: Platform.enum.FACEBOOK,
                contactId: contact.id,
                lastMessageAt: new Date(timestamp),
              });

          // 4. Store or edit message
          if (message_edit) {
            await InboxService.upsertMessage({
              inboxConversationId: conversation.id,
              externalId: message_edit.mid,
              senderContactId: contact.id,
              text: message_edit.text,
              payload: messaging,
              sender: message?.is_echo ? "self" : "user",
            });
            const event: InboxRealtimeEvent = {
              type: InboxRealtimeEventTypes.MessageUpserted,
              timestamp,
              conversationId: conversation.id,
              message: {
                id: "", // will not be used by client for edits
                externalId: message_edit.mid,
                sender: message?.is_echo ? "self" : "user",
                text: message_edit.text,
                attachments: [],
                createdAt: new Date(timestamp),
              },
            };
            await dispatchWorkspaceEvent(account.workspaceId, event);
          } else if (message) {
            const attachments = (message.attachments || []).map((a) => ({
              type: a.type,
              url: a.payload.url,
            }));
            await InboxService.upsertMessage({
              inboxConversationId: conversation.id,
              externalId: message.mid,
              senderContactId: contact.id,
              text: message.text ?? null,
              attachments,
              payload: messaging,
              sender: message.is_echo ? "self" : "user",
            });
            const event: InboxRealtimeEvent = {
              type: InboxRealtimeEventTypes.MessageUpserted,
              timestamp,
              conversationId: conversation.id,
              message: {
                id: "", // not needed for client append correctness
                externalId: message.mid,
                sender: message.is_echo ? "self" : "user",
                text: message.text ?? null,
                attachments,
                createdAt: new Date(timestamp),
              },
            };
            await dispatchWorkspaceEvent(account.workspaceId, event);
          }
          // conversation bump event
          const conversationEvent: InboxRealtimeEvent = {
            type: InboxRealtimeEventTypes.ConversationUpserted,
            timestamp,
            conversationId: conversation.id,
            lastMessageAt: new Date(timestamp),
            platform: Platform.enum.FACEBOOK,
            contact: {
              id: contact.id,
              name: contact.name,
              profilePicUrl: contact.profilePicUrl,
            },
          };
          await dispatchWorkspaceEvent(account.workspaceId, conversationEvent);
        }
      }
      return c.status(200);
    } catch (error) {
      console.error(error);
      return c.status(500);
    }
  });
