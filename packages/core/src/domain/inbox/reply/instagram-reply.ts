import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { InboxAttachment } from "@shared/inbox";
import type {
  CommentReplyTarget,
  DMReplyContext,
  DMReplyPayload,
} from "./types";

/**
 * Instagram-specific reply operations
 */
export namespace InstagramReply {
  /**
   * Send a DM reply via Instagram Messaging API
   */
  export async function sendDM(
    context: DMReplyContext,
    payload: DMReplyPayload,
  ) {
    console.info("[Instagram Reply][DM] sending message", {
      conversationId: context.conversationId,
      connectedAccountId: context.connectedAccountId,
    });

    const messagePayload = buildMessagePayload(
      payload.attachments,
      payload.text,
    );

    const requestBody: Record<string, unknown> = {
      recipient: { id: context.contactExternalId },
      message: messagePayload,
    };

    if (payload.replyToMessageId) {
      requestBody.reply_to = { mid: payload.replyToMessageId };
    }

    await instagramGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `instagram:${context.connectedAccountId}`,
      },
      "/me/messages",
      {
        method: "POST",
        body: requestBody,
      },
    );
  }

  /**
   * Send a comment reply via Instagram Graph API
   * Can reply to either a comment (uses /replies) or a media (uses /comments)
   */
  export async function sendComment(
    context: {
      accessToken: string;
      connectedAccountId: string;
      conversationId: string;
    },
    target: CommentReplyTarget,
    text: string,
  ) {
    const endpointSuffix = target.type === "comment" ? "replies" : "comments";

    console.info("[Instagram Reply][Comment] replying to", {
      conversationId: context.conversationId,
      targetType: target.type,
      targetId: target.id,
      endpointSuffix,
    });

    await instagramGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `instagram:${context.connectedAccountId}`,
      },
      `/${target.id}/${endpointSuffix}`,
      {
        method: "POST",
        body: {
          message: text,
        },
      },
    );
  }
}

function buildMessagePayload(
  attachments: InboxAttachment[],
  text: string | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (text && text.trim().length > 0) {
    payload.text = text;
  }

  if (attachments.length > 0) {
    if (attachments.length > 1) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "Instagram only supports sending one attachment per message in this flow.",
      );
    }

    const [attachment] = attachments;
    if (attachment.type !== "image") {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        `Unsupported Instagram DM attachment type: ${attachment.type}`,
      );
    }

    payload.attachment = {
      type: "image",
      payload: {
        url: attachment.url,
        is_reusable: true,
      },
    };
  }

  if (!payload.text && !payload.attachment) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
      "Instagram DM message must include text or an attachment.",
    );
  }

  return payload;
}
