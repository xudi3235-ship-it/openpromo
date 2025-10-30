import { ErrorCodes, VisibleError } from "@core/utils/error";
import { FacebookReply } from "./facebook-reply";
import { InstagramReply } from "./instagram-reply";
import { resolveCommentTarget } from "./target-resolver";
import type { CommentReplyContext } from "./types";

/**
 * Handles sending comment replies across platforms
 */
export namespace CommentReplyHandler {
  export async function send(context: CommentReplyContext, text: string) {
    // Resolve what we're replying to (comment ID or media ID)
    const target = await resolveCommentTarget(context);

    // Send via appropriate platform API
    switch (context.platform) {
      case "FACEBOOK":
        await FacebookReply.sendComment(context, target, text);
        break;

      case "INSTAGRAM":
        await InstagramReply.sendComment(context, target, text);
        break;

      default:
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_STATE,
          `Unsupported comment platform: ${context.platform}`,
        );
    }
  }
}
