import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import type { CommentReplyTarget, DMReplyContext } from "./types";

/**
 * Facebook-specific reply operations
 */
export namespace FacebookReply {
  /**
   * Send a DM reply via Facebook Messenger API
   */
  export async function sendDM(context: DMReplyContext, text: string) {
    console.info("[Facebook Reply][DM] sending message", {
      conversationId: context.conversationId,
      connectedAccountId: context.connectedAccountId,
    });

    await facebookGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `facebook:${context.connectedAccountId}`,
      },
      "/me/messages",
      {
        method: "POST",
        body: {
          recipient: { id: context.contactExternalId },
          messaging_type: "RESPONSE",
          message: { text },
        },
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
