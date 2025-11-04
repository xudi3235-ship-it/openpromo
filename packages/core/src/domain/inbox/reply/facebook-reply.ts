import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { InboxAttachment } from "@shared/inbox";
import type {
  CommentReplyTarget,
  DMReplyContext,
  DMReplyPayload,
} from "./types";

/**
 * Facebook-specific reply operations
 */
export namespace FacebookReply {
  /**
   * Send a DM reply via Facebook Messenger API
   */
  export async function sendDM(
    context: DMReplyContext,
    payload: DMReplyPayload,
  ) {
    console.info("[Facebook Reply][DM] sending message", {
      conversationId: context.conversationId,
      connectedAccountId: context.connectedAccountId,
    });

    const messagePayload = buildMessagePayload(
      payload.attachments,
      payload.text,
    );

    const requestBody: Record<string, unknown> = {
      recipient: { id: context.contactExternalId },
      messaging_type: "RESPONSE",
      message: messagePayload,
    };

    if (payload.replyToMessageId) {
      requestBody.reply_to = { mid: payload.replyToMessageId };
    }

    await facebookGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `facebook:${context.connectedAccountId}`,
      },
      "/me/messages",
      {
        method: "POST",
        body: requestBody,
      },
    );
  }

  /**
   * Send a comment reply via Facebook Graph API
   */
  export async function sendComment(
    context:
      | DMReplyContext
      | {
          accessToken: string;
          connectedAccountId: string;
          conversationId: string;
        },
    target: CommentReplyTarget,
    text: string,
  ) {
    if (target.type !== "comment") {
      throw new Error(
        `Facebook comment replies require a comment ID, got: ${target.type}`,
      );
    }

    console.info("[Facebook Reply][Comment] replying to comment", {
      conversationId: context.conversationId,
      commentId: target.id,
    });

    await facebookGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `facebook:${context.connectedAccountId}`,
      },
      `/${target.id}/comments`,
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
        "Facebook only supports sending one attachment per message in this flow.",
      );
    }

    const [attachment] = attachments;
    if (attachment.type !== "image") {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        `Unsupported Facebook DM attachment type: ${attachment.type}`,
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
      "Facebook DM message must include text or an attachment.",
    );
  }

  return payload;
}
