import { TikTokBusinessAPIClient } from "@core/domain/content/entity/tiktok/business-api-client";
import { UnifiedContent } from "@core/domain/content/unified-content";
import { getChannelMetadata } from "@core/domain/inbox/message-metadata";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { InboxMessageMetadata } from "@shared/inbox";
import type { CommentReplyContext, CommentReplyTarget } from "./types";

function extractString(
  source: Record<string, unknown> | undefined,
  key: string,
): string | null {
  if (!source) return null;
  const value = source[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveVideoId(
  context: CommentReplyContext,
): Promise<string | null> {
  const channelMeta = getChannelMetadata(
    context.conversationMetadata as InboxMessageMetadata,
    "TIKTOK",
    "post_comment",
  );
  const extra = channelMeta?.extra as Record<string, unknown> | undefined;
  const fromMetadata = extractString(extra, "videoId");
  if (fromMetadata) {
    return fromMetadata;
  }

  if (context.contentId) {
    const content = await UnifiedContent.getByID(context.contentId).catch(
      () => null,
    );
    if (content?.sourceContentId) {
      return content.sourceContentId;
    }
  }

  return null;
}

export namespace TikTokReply {
  export async function sendComment(
    context: CommentReplyContext,
    target: CommentReplyTarget,
    text: string,
  ) {
    if (context.platform !== "TIKTOK") {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "TikTokReply invoked for non-TikTok platform.",
      );
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
        "Reply text cannot be empty.",
      );
    }

    const businessId = context.connectedAccountExternalId;
    if (!businessId) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "TikTok account is missing the business identifier required to reply.",
      );
    }

    const videoId = await resolveVideoId(context);
    if (!videoId) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        "Unable to determine TikTok video for this conversation.",
      );
    }

    const client = TikTokBusinessAPIClient.fromIdentityContext({
      accessToken: context.accessToken,
      refreshToken: context.refreshToken ?? undefined,
      businessId,
      connectedAccountId: context.connectedAccountId,
    });

    if (target.type === "comment") {
      await client.replyToComment({
        videoId,
        commentId: target.id,
        text: trimmed,
      });
    } else {
      await client.createComment({
        videoId,
        text: trimmed,
      });
    }
  }
}
