import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import type { CommentReplyTarget, DMReplyContext } from "./types";

/**
 * Instagram-specific reply operations
 */
export namespace InstagramReply {
  /**
   * Send a DM reply via Instagram Messaging API
   */
  export async function sendDM(context: DMReplyContext, text: string) {
    console.info("[Instagram Reply][DM] sending message", {
      conversationId: context.conversationId,
      connectedAccountId: context.connectedAccountId,
    });

    await instagramGraphRequest(
      {
        accessToken: context.accessToken,
        rateLimitKey: `instagram:${context.connectedAccountId}`,
      },
      "/me/messages",
      {
        method: "POST",
        body: {
          recipient: { id: context.contactExternalId },
          message: { text },
        },
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
