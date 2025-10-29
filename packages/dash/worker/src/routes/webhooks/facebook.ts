import { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { UnifiedContent } from "@core/domain/content/unified-content";
import { InboxService } from "@core/domain/inbox";
import { appendChannelExtra } from "@core/domain/inbox/message-metadata";
import { handleFacebookDMEvents } from "@core/domain/inbox/webhooks/facebook-dm";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import type { ApiEnv } from "@core/helpers/api-env";
import { Platform } from "@core/schemas/connected-account.sql";
import { env } from "@core/utils/env";
import { facebookOAuthService } from "@openpromo/core/domain/connected-account/facebook-oauth-service";
import type {
  FBCommentPayload,
  FBWebhookPayload,
  InboxMessageMetadata,
} from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
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

        // Handle DM messages
        if ("messaging" in entry) {
          await handleFacebookDMEvents(entry.messaging, account);
        }

        // Handle feed comment changes
        if ("changes" in entry) {
          await handleComment(
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

const handleComment = async (
  changes: FBCommentPayload[],
  account: Awaited<ReturnType<typeof ConnectedAccount.fromFBPageID>>,
) => {
  for (const change of changes) {
    const {
      post_id,
      parent_id,
      comment_id,
      verb,
      from,
      message,
      created_time,
    } = change;
    const createdAt = new Date((created_time ?? 0) * 1000);

    // resolve commenter contact
    const isSelf = from.id === account.externalAccountId;
    let contact = await InboxService.findContact({
      platform: Platform.enum.FACEBOOK,
      externalId: from.id,
    });
    if (!contact) {
      const profile = await facebookOAuthService.getUserProfile(
        account.encryptedAccessToken,
        from.id,
      );
      contact = await InboxService.createContact({
        platform: Platform.enum.FACEBOOK,
        externalId: from.id,
        name: profile.name ?? from.name,
        profilePicUrl: profile.picture.data.url,
      });
    }

    const channel = "post_comment" as const;
    const isTopLevel = parent_id === post_id;
    const externalThreadId = isTopLevel ? comment_id : parent_id;

    // Ensure conversation exists when we need to write/update a message
    let conversation = await InboxService.findConversationByExternalThreadId({
      connectedAccountId: account.id,
      externalThreadId,
      channel,
    });

    const content = await UnifiedContent.getBySourceContentId(post_id, {
      skipWorkspaceCheck: true,
    });

    if (!conversation && (verb === "add" || isTopLevel)) {
      const conversationMetadata =
        post_id || parent_id
          ? {
              byPlatform: {
                FACEBOOK: {
                  post_comment: {
                    extra: {
                      postId: post_id,
                      parentId: parent_id,
                      isTopLevel,
                    },
                  },
                },
              },
            }
          : {};
      // create conversation for top-level add OR missing on reply (best-effort)
      conversation = await InboxService.upsertConversation({
        connectedAccountId: account.id,
        platform: Platform.enum.FACEBOOK,
        contactId: contact.id,
        lastMessageAt: createdAt,
        channel,
        externalThreadId,
        contentId: content?.id,
        metadata: conversationMetadata,
      });
    }

    if (!conversation) {
      // cannot proceed without a conversation; skip safely
      continue;
    }

    const metadata: InboxMessageMetadata = {
      extra: {
        postId: post_id,
        parentId: parent_id,
        verb,
        isTopLevel,
      },
    };
    if (verb === "remove") {
      metadata.deleted = true;
    }
    appendChannelExtra(metadata, "FACEBOOK", channel, {
      postId: post_id,
      parentId: parent_id,
      verb,
      isTopLevel,
    });

    await InboxService.upsertMessage({
      inboxConversationId: conversation.id,
      externalId: comment_id,
      text: verb === "remove" ? null : message,
      payload: change,
      sender: isSelf ? "self" : "user",
      workspaceId: account.workspaceId,
      channel,
      contentId: content?.id,
      metadata,
    });

    const messageEvent = createWorkspaceEvent(
      InboxRealtimeEventTypes.MessageUpserted,
      {
        conversationId: conversation.id,
        message: {
          id: "",
          externalId: comment_id,
          sender: isSelf ? "self" : "user",
          text: verb === "remove" ? null : message,
          attachments: [],
          createdAt,
          channel,
          contentId: content?.id,
          metadata,
        },
      },
    );
    await dispatchWorkspaceEvent(account.workspaceId, messageEvent);

    const conversationEvent = createWorkspaceEvent(
      InboxRealtimeEventTypes.ConversationUpserted,
      {
        conversationId: conversation.id,
        lastMessageAt: createdAt,
        platform: Platform.enum.FACEBOOK,
        contact: {
          id: contact.id,
          name: contact.name,
          profilePicUrl: contact.profilePicUrl,
        },
      },
    );
    await dispatchWorkspaceEvent(account.workspaceId, conversationEvent);
  }
};
