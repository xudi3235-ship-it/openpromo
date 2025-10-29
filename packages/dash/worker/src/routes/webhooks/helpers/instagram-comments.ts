import { instagramOAuthService } from "@core/domain/connected-account";
import type { ConnectedAccount } from "@core/domain/connected-account/connected-account";
import { UnifiedContent } from "@core/domain/content/unified-content";
import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { getDbClient } from "@core/helpers/db";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  IGCommentPayload,
  type IGCommentPayloadType,
  InboxRealtimeEventTypes,
} from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { eq } from "drizzle-orm";

const FALLBACK_USERNAME = "Instagram User";

export async function handleInstagramCommentChanges(
  rawChanges: unknown[],
  account: Awaited<ReturnType<typeof ConnectedAccount.fromIGAccountID>>,
) {
  const db = getDbClient();

  for (const rawChange of rawChanges ?? []) {
    const parsed = IGCommentPayload.safeParse(rawChange);
    if (!parsed.success) {
      continue;
    }
    const change = parsed.data;
    await processCommentChange(change, account, db);
  }
}

async function processCommentChange(
  change: IGCommentPayloadType,
  account: Awaited<ReturnType<typeof ConnectedAccount.fromIGAccountID>>,
  db: ReturnType<typeof getDbClient>,
) {
  const value = change.value;
  const actualCommentId = value.comment_id ?? value.id;
  if (!actualCommentId) return;

  const parentId = value.parent_id ?? actualCommentId;
  const mediaId = value.media?.id ?? value.media?.original_media_id ?? null;
  const timestampSeconds =
    value.created_time ?? value.timestamp ?? Math.floor(Date.now() / 1000);
  const createdAt = new Date(timestampSeconds * 1000);
  const from = value.from ?? {};
  const fromId = from.id ?? null;
  const senderIsBusiness = !!fromId && fromId === account.externalAccountId;
  const externalThreadId = parentId;
  const content =
    mediaId != null
      ? await UnifiedContent.getBySourceContentId(mediaId, {
          skipWorkspaceCheck: true,
        })
      : null;

  let conversation = await InboxService.findConversationByExternalThreadId({
    connectedAccountId: account.id,
    externalThreadId,
    channel: "post_comment",
  });

  if (!conversation) {
    if (senderIsBusiness) {
      // Business replies without an existing conversation cannot be attributed to a user; skip.
      return;
    }

    const contact = await ensureContactForComment(account, value);
    if (!contact) return;

    conversation = await InboxService.upsertConversation({
      connectedAccountId: account.id,
      platform: "INSTAGRAM",
      contactId: contact.id,
      lastMessageAt: createdAt,
      channel: "post_comment",
      threadKey: externalThreadId,
      externalThreadId,
      contentId: content?.id ?? null,
      metadata: mediaId ? { mediaId } : {},
    });
  }

  if (!conversation.contactId) {
    console.error("instagram comment handler missing conversation contactId", {
      conversationId: conversation.id,
      commentId: actualCommentId,
    });
    throw new Error("Conversation missing contactId");
  }

  const contactRecord = await db
    .select()
    .from(inboxContactsTable)
    .where(eq(inboxContactsTable.id, conversation.contactId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!contactRecord) {
    console.warn("instagram comment handler missing contact record", {
      conversationId: conversation.id,
      commentId: actualCommentId,
    });
    return;
  }

  const isRemove =
    value.verb === "remove" ||
    value.verb === "deleted" ||
    value.verb === "hide";

  const metadata: Record<string, unknown> = {
    parentId,
  };
  if (value.verb) metadata.verb = value.verb;
  if (mediaId) metadata.mediaId = mediaId;
  if (isRemove) metadata.deleted = true;

  const messageText = isRemove ? null : (value.text ?? null);
  const contentIdForMessage = content?.id ?? conversation.contentId ?? null;

  await InboxService.upsertMessage({
    inboxConversationId: conversation.id,
    externalId: actualCommentId,
    text: messageText,
    attachments: [],
    payload: change,
    sender: senderIsBusiness ? "self" : "user",
    workspaceId: account.workspaceId,
    channel: "post_comment",
    contentId: contentIdForMessage,
    metadata,
  });

  const messageEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId: conversation.id,
      message: {
        id: "",
        externalId: actualCommentId,
        sender: senderIsBusiness ? "self" : "user",
        text: messageText,
        attachments: [],
        createdAt,
        channel: "post_comment",
        contentId: contentIdForMessage,
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
      platform: "INSTAGRAM",
      contact: {
        id: contactRecord.id,
        name: contactRecord.name,
        profilePicUrl: contactRecord.profilePicUrl,
      },
    },
  );
  await dispatchWorkspaceEvent(account.workspaceId, conversationEvent);
}

async function ensureContactForComment(
  account: Awaited<ReturnType<typeof ConnectedAccount.fromIGAccountID>>,
  value: IGCommentPayloadType["value"],
) {
  const from = value.from ?? {};
  const externalId = from.id ?? from.username ?? null;
  if (!externalId) {
    console.warn("instagram comment missing contact identifier", {
      value,
    });
    return null;
  }

  const existing = await InboxService.findContact({
    platform: "INSTAGRAM",
    externalId,
  });
  if (existing) return existing;

  let profileName = from.username ?? FALLBACK_USERNAME;
  let profilePicUrl = "";

  if (from.id) {
    try {
      const profile = await instagramOAuthService.getUserProfile(
        account.encryptedAccessToken,
        from.id,
      );
      profileName =
        profile.name ?? profile.username ?? profileName ?? FALLBACK_USERNAME;
      profilePicUrl = profile.profile_pic ?? "";
    } catch (error) {
      console.warn("Failed to fetch Instagram profile for comment user", {
        userId: from.id,
        error,
      });
    }
  }

  return await InboxService.createContact({
    platform: "INSTAGRAM",
    externalId,
    name: profileName,
    profilePicUrl,
  });
}
