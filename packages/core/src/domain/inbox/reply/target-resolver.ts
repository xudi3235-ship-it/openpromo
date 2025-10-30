import { UnifiedContent } from "@core/domain/content/unified-content";
import { getChannelMetadata } from "@core/domain/inbox/message-metadata";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { CommentReplyContext, CommentReplyTarget } from "./types";

/**
 * Resolves the target for a comment reply by determining whether to reply
 * to a specific comment ID or directly to the media.
 *
 * Priority order:
 * 1. externalThreadId (the parent comment ID)
 * 2. mediaId from conversation metadata
 * 3. mediaId from linked content (sourceContentId)
 */
export async function resolveCommentTarget(
  context: CommentReplyContext,
): Promise<CommentReplyTarget> {
  // 1. Try external thread ID (parent comment)
  if (context.externalThreadId) {
    return {
      type: "comment",
      id: context.externalThreadId,
    };
  }

  // 2. Try metadata mediaId (for Instagram)
  const channelMeta =
    context.platform === "FACEBOOK" || context.platform === "INSTAGRAM"
      ? getChannelMetadata(
          context.conversationMetadata,
          context.platform,
          "post_comment",
        )
      : null;
  const metadataMediaId = channelMeta?.extra?.mediaId;

  if (typeof metadataMediaId === "string") {
    return {
      type: "media",
      id: metadataMediaId,
    };
  }

  // 3. Try content sourceContentId (fallback)
  if (context.contentId) {
    const content = await UnifiedContent.getByID(context.contentId).catch(
      () => null,
    );
    if (content?.sourceContentId) {
      return {
        type: "media",
        id: content.sourceContentId,
      };
    }
  }

  // No target found
  throw new VisibleError(
    "validation",
    ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
    `Unable to reply: missing ${context.platform} comment reference.`,
  );
}
