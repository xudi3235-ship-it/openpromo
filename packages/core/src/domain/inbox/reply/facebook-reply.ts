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
  ): Promise<{ mid: string }[]> {
    console.info("[Facebook Reply][DM] sending message", {
      conversationId: context.conversationId,
      connectedAccountId: context.connectedAccountId,
    });

    const hasAttachments = payload.attachments.length > 0;
    const hasText = payload.text && payload.text.trim().length > 0;

    const sentMessages: { mid: string }[] = [];

    // Split message if both text and attachments are present
    // Facebook API (#100) Only one of the text, attachment, and dynamic_text fields can be specified
    if (hasAttachments && hasText) {
      // 1. Send Attachment
      const attachmentPayload = buildMessagePayload(payload.attachments, null);
      const attachmentBody: Record<string, unknown> = {
        recipient: { id: context.contactExternalId },
        messaging_type: "RESPONSE",
        message: attachmentPayload,
      };

      if (payload.replyToMessageId) {
        attachmentBody.reply_to = { mid: payload.replyToMessageId };
      }

      const attachmentResponse = await facebookGraphRequest<{
        recipient_id: string;
        message_id: string;
      }>(
        {
          accessToken: context.accessToken,
          rateLimitKey: `facebook:${context.connectedAccountId}`,
        },
        "/me/messages",
        {
          method: "POST",
          body: attachmentBody,
        },
      );
      sentMessages.push({ mid: attachmentResponse.message_id });

      // 2. Send Text (no replyToMessageId to avoid threading issues or just simplicity)
      // If we want to maintain thread context, we assume the first message (attachment) established it.
      // Or we can reply to the same message ID for both.
      const textPayload = buildMessagePayload([], payload.text);
      const textBody: Record<string, unknown> = {
        recipient: { id: context.contactExternalId },
        messaging_type: "RESPONSE",
        message: textPayload,
      };

      // We don't attach reply_to to the second message to avoid weird threading structures,
      // or we could. For now, let's treat them as sequential messages.

      const textResponse = await facebookGraphRequest<{
        recipient_id: string;
        message_id: string;
      }>(
        {
          accessToken: context.accessToken,
          rateLimitKey: `facebook:${context.connectedAccountId}`,
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
      messaging_type: "RESPONSE",
      message: messagePayload,
    };

    if (payload.replyToMessageId) {
      requestBody.reply_to = { mid: payload.replyToMessageId };
    }

    const response = await facebookGraphRequest<{
      recipient_id: string;
      message_id: string;
    }>(
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
    sentMessages.push({ mid: response.message_id });
    return sentMessages;
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
    attachments: InboxAttachment[] = [],
  ) {
    if (target.type !== "comment") {
      throw new Error(
        `Facebook comment replies require a comment ID, got: ${target.type}`,
      );
    }

    console.info("[Facebook Reply][Comment] replying to comment", {
      conversationId: context.conversationId,
      commentId: target.id,
      hasAttachments: attachments.length > 0,
    });

    const body: Record<string, unknown> = {};

    if (text && text.trim().length > 0) {
      body.message = text;
    }

    if (attachments.length > 0) {
      if (attachments.length > 1) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          "Facebook only supports sending one attachment per comment.",
        );
      }

      const [attachment] = attachments;
      if (attachment.type !== "image") {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          `Unsupported Facebook comment attachment type: ${attachment.type}`,
        );
      }

      body.attachment_url = attachment.url;
    }

    if (!body.message && !body.attachment_url) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
        "Facebook comment reply must include text or an attachment.",
      );
    }

    await facebookGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `facebook:${context.connectedAccountId}`,
      },
      `/${target.id}/comments`,
      {
        method: "POST",
        body,
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
