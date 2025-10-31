import { facebookOAuthService } from "@core/domain/connected-account/facebook-oauth-service";
import { UnifiedContent } from "@core/domain/content/unified-content";
import { InboxService } from "@core/domain/inbox";
import { appendChannelExtra } from "@core/domain/inbox/message-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Platform } from "@core/schemas/connected-account.sql";
import type { FBCommentPayload, InboxMessageMetadata } from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";

type ConnectedAccount = Awaited<
  ReturnType<
    typeof import("@core/domain/connected-account/connected-account").ConnectedAccount.fromFBPageID
  >
>;

type InboxContact = Awaited<ReturnType<typeof InboxService.findContact>>;
type InboxConversation = Awaited<
  ReturnType<typeof InboxService.findConversationByExternalThreadId>
>;

/**
 * Process Facebook feed comment webhook events
 */
export async function handleFacebookCommentChanges(
  changes: FBCommentPayload[],
  account: ConnectedAccount,
): Promise<void> {
  for (const change of changes) {
    try {
      await processCommentEvent(change, account);
    } catch (error) {
      console.error("Error processing Facebook comment event", {
        commentId: change.comment_id,
        postId: change.post_id,
        error,
      });
    }
  }
}

/**
 * Process a single Facebook comment event
 */
async function processCommentEvent(
  change: FBCommentPayload,
  account: ConnectedAccount,
): Promise<void> {
  const { post_id, parent_id, comment_id, verb, from, created_time } = change;
  const createdAt = new Date((created_time ?? 0) * 1000);

  // Resolve commenter contact
  const isSelf = from.id === account.externalAccountId;
  const contact = await resolveContact(from, isSelf, account);

  // Determine conversation parameters
  const channel = "post_comment" as const;
  const isTopLevel = parent_id === post_id;
  const externalThreadId = isTopLevel ? comment_id : parent_id;

  // Resolve or create conversation
  let content = await UnifiedContent.getBySourceContentId(post_id, {
    skipWorkspaceCheck: true,
  });

  // Backfill content if not found
  if (!content && post_id) {
    console.info("[FB comments][media] backfilling unified content", {
      accountId: account.id,
      postId: post_id,
    });
    const backfilledContent = await UnifiedContent.fromFacebookPost(post_id, {
      accessToken: account.encryptedAccessToken,
      connectedAccountId: account.id,
      workspaceId: account.workspaceId,
      pageId: account.externalAccountId,
    }).catch((error) => {
      console.error("[FB comments][media] failed to backfill", {
        accountId: account.id,
        postId: post_id,
        error,
      });
      return null;
    });
    if (backfilledContent) {
      content = backfilledContent;
    }
  }

  const conversation = await resolveConversation(
    externalThreadId,
    channel,
    account,
    contact,
    verb,
    isTopLevel,
    post_id,
    parent_id,
    content?.id,
    createdAt,
  );

  if (!conversation) {
    // Cannot proceed without a conversation; skip safely
    return;
  }

  // Store or update message
  await storeMessage(
    change,
    conversation,
    contact,
    account,
    isSelf,
    content?.id,
    createdAt,
  );

  // Dispatch realtime events
  await dispatchMessageEvent(
    change,
    conversation,
    isSelf,
    content?.id,
    account,
    createdAt,
  );

  await dispatchConversationEvent(conversation, contact, account, createdAt);
}

/**
 * Resolve contact from database or fetch from Facebook API
 */
async function resolveContact(
  from: FBCommentPayload["from"],
  _isSelf: boolean,
  account: ConnectedAccount,
): Promise<InboxContact> {
  let contact = await InboxService.findContact({
    platform: Platform.enum.FACEBOOK,
    externalId: from.id,
  });

  if (!contact) {
    const profile = await facebookOAuthService.getUserProfile(
      account.encryptedAccessToken,
      from.id,
    );

    contact = await InboxService.createContact({
      platform: Platform.enum.FACEBOOK,
      externalId: from.id,
      name: profile.name ?? from.name,
      profilePicUrl: profile.picture.data.url,
    });
  }

  return contact;
}

/**
 * Get or create conversation for the comment thread
 */
async function resolveConversation(
  externalThreadId: string,
  channel: "post_comment",
  account: ConnectedAccount,
  contact: InboxContact,
  verb: string,
  isTopLevel: boolean,
  postId: string,
  parentId: string,
  contentId: string | undefined,
  createdAt: Date,
): Promise<InboxConversation | null> {
  let conversation = await InboxService.findConversationByExternalThreadId({
    connectedAccountId: account.id,
    externalThreadId,
    channel,
  });

  // Create conversation for top-level add OR missing on reply (best-effort)
  if (!conversation && (verb === "add" || isTopLevel)) {
    const conversationMetadata =
      postId || parentId
        ? {
            byPlatform: {
              FACEBOOK: {
                post_comment: {
                  extra: {
                    postId,
                    parentId,
                    isTopLevel,
                  },
                },
              },
            },
          }
        : {};

    conversation = await InboxService.upsertConversation({
      connectedAccountId: account.id,
      platform: Platform.enum.FACEBOOK,
      contactId: contact.id,
      lastMessageAt: createdAt,
      channel,
      externalThreadId,
      contentId,
      metadata: conversationMetadata,
    });
  }

  return conversation;
}

/**
 * Store or update message in database
 */
async function storeMessage(
  change: FBCommentPayload,
  conversation: NonNullable<InboxConversation>,
  _contact: InboxContact,
  account: ConnectedAccount,
  isSelf: boolean,
  contentId: string | undefined,
  _createdAt: Date,
): Promise<void> {
  const { post_id, parent_id, comment_id, verb, message } = change;
  const isTopLevel = parent_id === post_id;

  const metadata: InboxMessageMetadata = {
    extra: {
      postId: post_id,
      parentId: parent_id,
      verb,
      isTopLevel,
    },
  };

  if (verb === "remove") {
    metadata.deleted = true;
  }

  appendChannelExtra(metadata, "FACEBOOK", conversation.channel, {
    postId: post_id,
    parentId: parent_id,
    verb,
    isTopLevel,
  });

  await InboxService.upsertMessage({
    inboxConversationId: conversation.id,
    externalId: comment_id,
    text: verb === "remove" ? null : message,
    payload: change,
    sender: isSelf ? "self" : "user",
    workspaceId: account.workspaceId,
    channel: conversation.channel,
    contentId: contentId ?? null,
    metadata,
  });
}

/**
 * Dispatch message upserted event
 */
async function dispatchMessageEvent(
  change: FBCommentPayload,
  conversation: NonNullable<InboxConversation>,
  isSelf: boolean,
  contentId: string | undefined,
  account: ConnectedAccount,
  createdAt: Date,
): Promise<void> {
  const { post_id, parent_id, comment_id, verb, message } = change;
  const isTopLevel = parent_id === post_id;

  const metadata: InboxMessageMetadata = {
    extra: {
      postId: post_id,
      parentId: parent_id,
      verb,
      isTopLevel,
    },
  };

  if (verb === "remove") {
    metadata.deleted = true;
  }

  appendChannelExtra(metadata, "FACEBOOK", conversation.channel, {
    postId: post_id,
    parentId: parent_id,
    verb,
    isTopLevel,
  });

  const messageEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId: conversation.id,
      message: {
        id: "",
        externalId: comment_id,
        sender: isSelf ? "self" : "user",
        text: verb === "remove" ? null : message,
        attachments: [],
        createdAt,
        channel: conversation.channel,
        contentId: contentId ?? null,
        metadata,
      },
    },
  );

  await dispatchWorkspaceEvent(account.workspaceId, messageEvent);
}

/**
 * Dispatch conversation upserted event
 */
async function dispatchConversationEvent(
  conversation: NonNullable<InboxConversation>,
  contact: InboxContact,
  account: ConnectedAccount,
  createdAt: Date,
): Promise<void> {
  const conversationEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.ConversationUpserted,
    {
      conversationId: conversation.id,
      lastMessageAt: createdAt,
      platform: Platform.enum.FACEBOOK,
      contact: {
        id: contact.id,
        name: contact.name,
        profilePicUrl: contact.profilePicUrl,
      },
    },
  );

  await dispatchWorkspaceEvent(account.workspaceId, conversationEvent);
}
