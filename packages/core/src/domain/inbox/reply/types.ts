import type { InboxChannel } from "@core/schemas/inbox-conversations.sql";
import type { AllPlatforms } from "@shared/content";
import type { InboxMessageMetadata } from "@shared/inbox";

/**
 * Common data needed for any reply operation
 */
export type ReplyContext = {
  conversationId: string;
  platform: AllPlatforms;
  channel: InboxChannel;
  connectedAccountId: string;
  accessToken: string;
  contactExternalId: string;
  workspaceId: string;
};

/**
 * DM-specific reply context
 */
export type DMReplyContext = ReplyContext & {
  channel: "dm";
};

/**
 * Comment-specific reply context
 */
export type CommentReplyContext = ReplyContext & {
  channel: "post_comment";
  externalThreadId: string | null;
  contentId: string | null;
  conversationMetadata: InboxMessageMetadata;
};

/**
 * Reply target for comments - either a comment ID or media ID
 */
export type CommentReplyTarget = {
  type: "comment" | "media";
  id: string;
};

/**
 * Input to send a reply
 */
export type SendReplyInput = {
  conversationId: string;
  text: string;
  replyToMessageId?: string | null;
};
