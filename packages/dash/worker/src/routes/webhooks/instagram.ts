import { instagramOAuthService } from "@core/domain/connected-account";
import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import type { ApiEnv } from "@core/helpers/api-env";
import { Platform } from "@core/schemas/connected-account.sql";
import { env } from "@core/utils/env";
import { type IGWebhookPayload, InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
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
          for (const messaging of entry.messaging) {
            const { sender, recipient, message, message_edit, timestamp } =
              messaging;
            if (!message && !message_edit) continue;

            const contactExternalId = message?.is_echo
              ? recipient.id
              : sender.id;
            // 2. Resolve existing contact or fetch profile; error if neither
            let contact = await InboxService.findContact({
              platform: Platform.enum.INSTAGRAM,
              externalId: contactExternalId,
            });
            if (!contact) {
              const profile = await instagramOAuthService.getUserProfile(
                account.encryptedAccessToken,
                contactExternalId,
              );
              contact = await InboxService.createContact({
                platform: Platform.enum.INSTAGRAM,
                externalId: contactExternalId,
                name: profile.name || profile.username,
                profilePicUrl: profile.profile_pic || "",
              });
            }
            // 3. Get or upsert conversation
            let conversation = message_edit
              ? await InboxService.getConversation({
                  connectedAccountId: account.id,
                  contactId: contact.id,
                  channel: "dm",
                })
              : null;

            if (!conversation) {
              conversation = await InboxService.upsertConversation({
                connectedAccountId: account.id,
                platform: Platform.enum.INSTAGRAM,
                contactId: contact.id,
                lastMessageAt: new Date(timestamp),
                channel: "dm",
                threadKey: contact.id,
              });
            }

            // 4. Store or edit message
            if (message_edit) {
              await InboxService.upsertMessage({
                inboxConversationId: conversation.id,
                externalId: message_edit.mid,
                text: message_edit.text,
                payload: messaging,
                sender: message?.is_echo ? "self" : "user",
                workspaceId: account.workspaceId,
                channel: conversation.channel,
              });
              const event = createWorkspaceEvent(
                InboxRealtimeEventTypes.MessageUpserted,
                {
                  conversationId: conversation.id,
                  message: {
                    id: "",
                    externalId: message_edit.mid,
                    sender: message?.is_echo ? "self" : "user",
                    text: message_edit.text,
                    attachments: [],
                    createdAt: new Date(timestamp),
                    channel: conversation.channel,
                    contentId: null,
                    metadata: {},
                  },
                },
              );
              await dispatchWorkspaceEvent(account.workspaceId, event);
            } else if (message) {
              const attachments = (message.attachments || []).map((a) => ({
                type: a.type,
                url: a.payload.url,
              }));
              await InboxService.upsertMessage({
                inboxConversationId: conversation.id,
                externalId: message.mid,
                text: message.text ?? null,
                attachments,
                payload: messaging,
                sender: message.is_echo ? "self" : "user",
                workspaceId: account.workspaceId,
                channel: conversation.channel,
              });
              const event = createWorkspaceEvent(
                InboxRealtimeEventTypes.MessageUpserted,
                {
                  conversationId: conversation.id,
                  message: {
                    id: "",
                    externalId: message.mid,
                    sender: message.is_echo ? "self" : "user",
                    text: message.text ?? null,
                    attachments,
                    createdAt: new Date(timestamp),
                    channel: conversation.channel,
                    contentId: null,
                    metadata: {},
                  },
                },
              );
              await dispatchWorkspaceEvent(account.workspaceId, event);
            }
            const conversationEvent = createWorkspaceEvent(
              InboxRealtimeEventTypes.ConversationUpserted,
              {
                conversationId: conversation.id,
                lastMessageAt: new Date(timestamp),
                platform: Platform.enum.INSTAGRAM,
                contact: {
                  id: contact.id,
                  name: contact.name,
                  profilePicUrl: contact.profilePicUrl,
                },
              },
            );
            await dispatchWorkspaceEvent(
              account.workspaceId,
              conversationEvent,
            );
          }
        }
        return c.status(200);
      } catch (error) {
        console.error(error);
        return c.status(500);
      }
    },
  );
