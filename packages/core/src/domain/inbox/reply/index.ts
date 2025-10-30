/**
 * Reply system for inbox messages
 *
 * This module provides a clean separation of concerns for handling replies:
 *
 * - Platform-specific adapters (Facebook, Instagram)
 * - Channel-specific handlers (DM, Comments)
 * - Reply target resolution (comment ID vs media ID)
 *
 * Usage:
 *   import { InboxReplyService } from "@core/domain/inbox/reply-service"
 *   await InboxReplyService.sendReply({ conversationId, text })
 */

export { CommentReplyHandler } from "./comment-reply-handler";
export { DMReplyHandler } from "./dm-reply-handler";
export { FacebookReply } from "./facebook-reply";
export { InstagramReply } from "./instagram-reply";
export { resolveCommentTarget } from "./target-resolver";
export type {
  CommentReplyContext,
  CommentReplyTarget,
  DMReplyContext,
  ReplyContext,
  SendReplyInput,
} from "./types";
