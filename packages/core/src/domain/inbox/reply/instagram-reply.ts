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
  ): Promise<{ mid: string }[]> {
    console.info("[Instagram Reply][DM] sending message", {
      conversationId: context.conversationId,
      connectedAccountId: context.connectedAccountId,
    });

    const hasAttachments = payload.attachments.length > 0;
    const hasText = payload.text && payload.text.trim().length > 0;

    const sentMessages: { mid: string }[] = [];

    // Split message if both text and attachments are present
    // Instagram API likely has similar constraints or it's safer to align behavior
    if (hasAttachments && hasText) {
      // 1. Send Attachment
      const attachmentPayload = buildMessagePayload(payload.attachments, null);
      const attachmentBody: Record<string, unknown> = {
        recipient: { id: context.contactExternalId },
        message: attachmentPayload,
      };

      // Instagram API doesn't support reply_to with attachments
      // Skip reply_to for attachment message
      if (payload.replyToMessageId) {
        console.warn(
          "[Instagram Reply][DM] Skipping reply_to for attachment message",
          {
            replyToMid: payload.replyToMessageId,
            reason: "Instagram API doesn't support reply_to with attachments",
          },
        );
      }

      const attachmentResponse = await instagramGraphRequest<{
        recipient_id: string;
        message_id: string;
      }>(
        {
          accessToken: context.accessToken,
          rateLimitKey: `instagram:${context.connectedAccountId}`,
        },
        "/me/messages",
        {
          method: "POST",
          body: attachmentBody,
        },
      );
      sentMessages.push({ mid: attachmentResponse.message_id });

      // 2. Send Text (with reply_to if available)
      const textPayload = buildMessagePayload([], payload.text);
      const textBody: Record<string, unknown> = {
        recipient: { id: context.contactExternalId },
        message: textPayload,
      };

      // Add reply_to to text message (Instagram supports this)
      if (payload.replyToMessageId) {
        textBody.reply_to = { mid: payload.replyToMessageId };
        console.info("[Instagram Reply][DM] Adding reply_to to text message", {
          replyToMid: payload.replyToMessageId,
        });
      }

      const textResponse = await instagramGraphRequest<{
        recipient_id: string;
        message_id: string;
      }>(
        {
          accessToken: context.accessToken,
          rateLimitKey: `instagram:${context.connectedAccountId}`,
        },
        "/me/messages",
        {
          method: "POST",
          body: textBody,
        },
      );
      sentMessages.push({ mid: textResponse.message_id });
      return sentMessages;
    }

    const messagePayload = buildMessagePayload(
      payload.attachments,
      payload.text,
    );

    const requestBody: Record<string, unknown> = {
      recipient: { id: context.contactExternalId },
      message: messagePayload,
    };

    // Instagram API: reply_to can only be used with text messages, not attachments
    // If we have attachments, skip reply_to to avoid "Invalid parameter" error
    if (payload.replyToMessageId && payload.attachments.length === 0) {
      requestBody.reply_to = { mid: payload.replyToMessageId };
      console.info("[Instagram Reply][DM] Adding reply_to", {
        replyToMid: payload.replyToMessageId,
        hasAttachments: false,
      });
    } else if (payload.replyToMessageId && payload.attachments.length > 0) {
      console.warn(
        "[Instagram Reply][DM] Skipping reply_to for attachment message",
        {
          replyToMid: payload.replyToMessageId,
          hasAttachments: true,
          reason: "Instagram API doesn't support reply_to with attachments",
        },
      );
    }

    console.info("[Instagram Reply][DM] Request body", {
      hasRecipient: !!requestBody.recipient,
      hasMessage: !!requestBody.message,
      hasReplyTo: !!requestBody.reply_to,
      messageKeys: Object.keys(messagePayload),
    });

    const response = await instagramGraphRequest<{
      recipient_id: string;
      message_id: string;
    }>(
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
    sentMessages.push({ mid: response.message_id });
    return sentMessages;
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
    attachments: InboxAttachment[] = [],
  ) {
    if (attachments.length > 0) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "Attachments are not supported for Instagram comment replies.",
      );
    }

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
