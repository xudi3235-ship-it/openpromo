import { ConnectedAccount } from "@core/domain/connected-account";
import {
  TikTokBusinessAPIClient,
  type TikTokBusinessComment,
} from "@core/domain/content/entity/tiktok/business-api-client";
import { UnifiedContent } from "@core/domain/content/unified-content";
import { InboxService } from "@core/domain/inbox";
import { appendChannelExtra } from "@core/domain/inbox/message-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Platform } from "@core/schemas/connected-account.sql";
import type { InboxMessageMetadata } from "@shared/inbox";
import {
  InboxRealtimeEventTypes,
  TikTokBusinessCommentPayload,
  type TikTokCommentUpdateEventType,
} from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";

type TikTokAccount = Awaited<
  ReturnType<typeof ConnectedAccount.fromTikTokAccountID>
>;

/**
 * Process TikTok Business comment.update webhook events
 */
export async function handleTikTokBusinessCommentEvent(
  event: TikTokCommentUpdateEventType,
): Promise<void> {
  const account = await ConnectedAccount.fromTikTokAccountID(
    event.business_id,
    {
      skipWorkspaceCheck: true,
      disableAutoRefresh: true,
    },
  );

  const client = TikTokBusinessAPIClient.fromIdentityContext({
    accessToken: account.encryptedAccessToken,
    refreshToken: account.refreshToken,
    businessId: account.externalAccountId,
    connectedAccountId: account.id,
  });

  const comment = await fetchCommentDetails(client, event);
  if (!comment) {
    console.warn("[TikTok comments] comment not found", {
      commentId: event.comment_id,
      businessId: event.business_id,
    });
    return;
  }

  await upsertCommentMessage(event, comment, account);
}

async function fetchCommentDetails(
  client: TikTokBusinessAPIClient,
  event: TikTokCommentUpdateEventType,
): Promise<TikTokBusinessComment | null> {
  try {
    const { comments } = await client.listComments({
      videoId: event.video_id,
      commentIds: [event.comment_id],
      includeReplies: true,
    });
    return comments[0] ?? null;
  } catch (error) {
    console.error("[TikTok comments] failed to fetch comment detail", {
      commentId: event.comment_id,
      businessId: event.business_id,
      error,
    });
    return null;
  }
}

async function upsertCommentMessage(
  event: TikTokCommentUpdateEventType,
  comment: TikTokBusinessComment,
  account: TikTokAccount,
): Promise<void> {
  const parentCommentId =
    comment.parentCommentId ?? comment.commentId ?? event.comment_id;
  const videoId = comment.videoId ?? event.video_id;
  const senderIsSelf = comment.owner ?? false;
  const createdAt = comment.createdAt ?? new Date();

  const content = await UnifiedContent.getBySourceContentId(videoId, {
    skipWorkspaceCheck: true,
  });

  if (!content) {
    console.info("[TikTok comments] missing unified content", {
      videoId,
      commentId: comment.commentId,
    });
  }

  const contact = await ensureContact(account, comment);
  if (!contact) return;

  let conversation = await InboxService.findConversationByExternalThreadId({
    connectedAccountId: account.id,
    externalThreadId: parentCommentId,
    channel: "post_comment",
  });

  if (!conversation) {
    if (senderIsSelf) {
      console.info(
        "[TikTok comments] self-authored comment without conversation",
        {
          accountId: account.id,
          commentId: comment.commentId,
          parentCommentId,
        },
      );
      return;
    }

    conversation = await InboxService.upsertConversation({
      connectedAccountId: account.id,
      platform: Platform.enum.TIKTOK,
      contactId: contact.id,
      lastMessageAt: createdAt,
      channel: "post_comment",
      threadKey: parentCommentId,
      externalThreadId: parentCommentId,
      contentId: content?.id ?? null,
      metadata: {
        byPlatform: {
          TIKTOK: {
            post_comment: {
              extra: {
                videoId,
                parentCommentId,
              },
            },
          },
        },
      },
    });
  }

  const metadata: InboxMessageMetadata = {
    extra: {
      videoId,
      parentCommentId,
      commentAction: event.comment_action,
      status: comment.status,
    },
  };

  if (event.comment_action === "delete") {
    metadata.deleted = true;
  }

  appendChannelExtra(metadata, Platform.enum.TIKTOK, "post_comment", {
    videoId,
    parentCommentId,
    commentAction: event.comment_action,
    status: comment.status,
  });

  const payload = TikTokBusinessCommentPayload.parse({
    platform: "tiktok_business",
    eventType: "comment.update",
    businessId: event.business_id,
    videoId,
    commentId: comment.commentId,
    commentAction: event.comment_action,
    comment: {
      comment_id: comment.commentId,
      video_id: videoId,
      parent_comment_id: comment.parentCommentId ?? undefined,
      text: comment.text,
      status: comment.status,
      create_time: comment.createTime,
      likes: comment.likes,
      liked: comment.liked,
      replies: comment.replies,
      owner: comment.owner,
      pinned: comment.pinned,
      unique_identifier: comment.uniqueIdentifier,
      user_id: comment.userId,
      username: comment.username,
      display_name: comment.displayName,
      profile_image: comment.profileImage,
    },
  });

  const text = metadata.deleted ? null : (comment.text ?? null);

  await InboxService.upsertMessage({
    inboxConversationId: conversation.id,
    externalId: comment.commentId,
    text,
    payload,
    sender: senderIsSelf ? "self" : "user",
    workspaceId: account.workspaceId,
    channel: "post_comment",
    contentId: content?.id ?? conversation.contentId ?? null,
    metadata,
  });

  const messageEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId: conversation.id,
      message: {
        id: "",
        externalId: comment.commentId,
        sender: senderIsSelf ? "self" : "user",
        text,
        attachments: [],
        createdAt,
        channel: "post_comment",
        contentId: content?.id ?? conversation.contentId ?? null,
        metadata,
      },
    },
  );
  await dispatchWorkspaceEvent(account.workspaceId, messageEvent);

  const conversationEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.ConversationUpserted,
    {
      conversationId: conversation.id,
      lastMessageAt: createdAt,
      platform: Platform.enum.TIKTOK,
      contact: {
        id: contact.id,
        name: contact.name,
        profilePicUrl: contact.profilePicUrl,
      },
    },
  );
  await dispatchWorkspaceEvent(account.workspaceId, conversationEvent);
}

async function ensureContact(
  account: TikTokAccount,
  comment: TikTokBusinessComment,
) {
  const candidateExternalIds = [
    comment.uniqueIdentifier,
    comment.userId,
    comment.username,
    comment.commentId,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  if (candidateExternalIds.length === 0) {
    console.warn("[TikTok comments] missing commenter id", {
      accountId: account.id,
      commentId: comment.commentId,
    });
    return null;
  }

  const preferredExternalId = candidateExternalIds[0];
  let existingContact = null;

  for (const candidate of candidateExternalIds) {
    existingContact = await InboxService.findContact({
      platform: Platform.enum.TIKTOK,
      externalId: candidate,
    });
    if (existingContact) {
      break;
    }
  }

  const name =
    comment.displayName ||
    comment.username ||
    comment.uniqueIdentifier ||
    "TikTok user";
  const profilePicUrl = comment.profileImage ?? "";

  if (existingContact) {
    const updates: {
      externalId?: string;
      name?: string;
      profilePicUrl?: string;
    } = {};

    if (
      preferredExternalId &&
      existingContact.externalId !== preferredExternalId
    ) {
      updates.externalId = preferredExternalId;
    }

    if (name && name !== existingContact.name) {
      updates.name = name;
    }

    if (
      profilePicUrl &&
      profilePicUrl.length > 0 &&
      profilePicUrl !== existingContact.profilePicUrl
    ) {
      updates.profilePicUrl = profilePicUrl;
    }

    if (Object.keys(updates).length > 0) {
      const updated = await InboxService.updateContact({
        id: existingContact.id,
        ...updates,
      });
      return updated ?? existingContact;
    }

    return existingContact;
  }

  return InboxService.createContact({
    platform: Platform.enum.TIKTOK,
    externalId: preferredExternalId,
    name,
    profilePicUrl,
  });
}
