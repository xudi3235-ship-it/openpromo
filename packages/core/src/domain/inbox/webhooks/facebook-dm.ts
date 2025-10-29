import { facebookOAuthService } from "@core/domain/connected-account/facebook-oauth-service";
import { InboxService } from "@core/domain/inbox";
import {
  appendChannelExtra,
  setEditMetadata,
  upsertReactionMetadata,
} from "@core/domain/inbox/message-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { db } from "@core/helpers/db";
import { Platform } from "@core/schemas/connected-account.sql";
import type { InboxChannel } from "@core/schemas/inbox-conversations.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { inboxMessagesTable } from "@core/schemas/inbox-messages.sql";
import type { FBMessagePayload, InboxMessageMetadata } from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { and, eq } from "drizzle-orm";

type ConnectedAccount = Awaited<
  ReturnType<
    typeof import("@core/domain/connected-account/connected-account").ConnectedAccount.fromFBPageID
  >
>;

type InboxContact = Awaited<ReturnType<typeof InboxService.findContact>>;
type InboxConversation = Awaited<
  ReturnType<typeof InboxService.getConversation>
>;

/**
 * Process Facebook Direct Message webhook events
 */
export async function handleFacebookDMEvents(
  messages: FBMessagePayload[],
  account: ConnectedAccount,
): Promise<void> {
  for (const messaging of messages) {
    try {
      await processDMEvent(messaging, account);
    } catch (error) {
      console.error("Error processing Facebook DM event", {
        messageId: messaging.message?.mid ?? messaging.message_edit?.mid,
        error,
      });
    }
  }
}

/**
 * Process a single Facebook DM event
 */
async function processDMEvent(
  messaging: FBMessagePayload,
  account: ConnectedAccount,
): Promise<void> {
  const {
    sender,
    recipient,
    message,
    message_edit,
    reaction,
    read,
    timestamp,
  } = messaging;

  // Handle read receipt events
  if (read) {
    await handleMessageRead(read, messaging, account);
    return;
  }

  // Handle reaction events
  if (reaction) {
    await handleMessageReaction(reaction, messaging, account, timestamp);
    return;
  }

  if (!message && !message_edit) {
    return;
  }

  const contactExternalId = message?.is_echo ? recipient.id : sender.id;

  // Resolve contact (existing or fetch from API)
  const contact = await resolveContact(
    contactExternalId,
    account.encryptedAccessToken,
  );

  // Get or create conversation
  const conversation = await resolveConversation(
    message_edit,
    account,
    contact,
    timestamp,
  );

  // Handle message edit or new message
  if (message_edit) {
    await handleMessageEdit(
      message_edit,
      message,
      messaging,
      conversation,
      account,
      timestamp,
    );
  } else if (message) {
    await handleNewMessage(
      message,
      messaging,
      conversation,
      account,
      timestamp,
    );
  }

  // Dispatch conversation bump event
  await dispatchConversationEvent(conversation, contact, account, timestamp);
}

/**
 * Resolve contact from database or fetch from Facebook API
 */
async function resolveContact(
  contactExternalId: string,
  encryptedAccessToken: string,
): Promise<InboxContact> {
  let contact = await InboxService.findContact({
    platform: Platform.enum.FACEBOOK,
    externalId: contactExternalId,
  });

  if (!contact) {
    const profile = await facebookOAuthService.getUserProfile(
      encryptedAccessToken,
      contactExternalId,
    );

    contact = await InboxService.createContact({
      platform: Platform.enum.FACEBOOK,
      externalId: contactExternalId,
      name: profile.name,
      profilePicUrl: profile.picture.data.url,
    });
  }

  return contact;
}

/**
 * Get or create conversation for the DM thread
 */
async function resolveConversation(
  messageEdit: FBMessagePayload["message_edit"],
  account: ConnectedAccount,
  contact: InboxContact,
  timestamp: number,
): Promise<InboxConversation> {
  // For edits, try to get existing conversation
  if (messageEdit) {
    const conversation = await InboxService.getConversation({
      connectedAccountId: account.id,
      contactId: contact.id,
      channel: "dm",
    });

    if (conversation) {
      return conversation;
    }
  }

  // Create or update conversation
  return InboxService.upsertConversation({
    connectedAccountId: account.id,
    platform: Platform.enum.FACEBOOK,
    contactId: contact.id,
    lastMessageAt: new Date(timestamp),
    channel: "dm",
    threadKey: contact.id,
  });
}

/**
 * Handle message edit event
 */
async function handleMessageEdit(
  messageEdit: NonNullable<FBMessagePayload["message_edit"]>,
  message: FBMessagePayload["message"],
  messaging: FBMessagePayload,
  conversation: InboxConversation,
  account: ConnectedAccount,
  timestamp: number,
): Promise<void> {
  const metadata: InboxMessageMetadata = {};
  const isoTimestamp = new Date(timestamp).toISOString();
  const editBy = message?.is_echo ? "self" : "other";

  setEditMetadata(metadata, {
    at: isoTimestamp,
    by: editBy,
    text: messageEdit.text ?? undefined,
  });

  const editExtra: Record<string, unknown> = {};
  if (typeof messageEdit.num_edit === "number") {
    editExtra.numEdits = messageEdit.num_edit;
  }

  if (Object.keys(editExtra).length > 0) {
    appendChannelExtra(metadata, "FACEBOOK", conversation.channel, editExtra);
  }

  await InboxService.upsertMessage({
    inboxConversationId: conversation.id,
    externalId: messageEdit.mid,
    text: messageEdit.text,
    payload: messaging,
    sender: message?.is_echo ? "self" : "user",
    workspaceId: account.workspaceId,
    channel: conversation.channel,
    metadata,
  });

  const event = createWorkspaceEvent(InboxRealtimeEventTypes.MessageUpserted, {
    conversationId: conversation.id,
    message: {
      id: "", // will not be used by client for edits
      externalId: messageEdit.mid,
      sender: message?.is_echo ? "self" : "user",
      text: messageEdit.text,
      attachments: [],
      createdAt: new Date(timestamp),
      channel: conversation.channel,
      contentId: null,
      metadata,
    },
  });

  await dispatchWorkspaceEvent(account.workspaceId, event);
}

/**
 * Handle new message event
 */
async function handleNewMessage(
  message: NonNullable<FBMessagePayload["message"]>,
  messaging: FBMessagePayload,
  conversation: InboxConversation,
  account: ConnectedAccount,
  timestamp: number,
): Promise<void> {
  const attachments = (message.attachments || []).map((a) => ({
    type: a.type,
    url: a.payload.url,
  }));

  await InboxService.upsertMessage({
    inboxConversationId: conversation.id,
    externalId: message.mid,
    text: message.text ?? null,
    attachments,
    payload: messaging,
    sender: message.is_echo ? "self" : "user",
    workspaceId: account.workspaceId,
    channel: conversation.channel,
  });

  const event = createWorkspaceEvent(InboxRealtimeEventTypes.MessageUpserted, {
    conversationId: conversation.id,
    message: {
      id: "", // not needed for client append correctness
      externalId: message.mid,
      sender: message.is_echo ? "self" : "user",
      text: message.text ?? null,
      attachments,
      createdAt: new Date(timestamp),
      channel: conversation.channel,
      contentId: null,
      metadata: {},
    },
  });

  await dispatchWorkspaceEvent(account.workspaceId, event);
}

/**
 * Handle message read receipt event
 */
async function handleMessageRead(
  readData: NonNullable<FBMessagePayload["read"]>,
  messaging: FBMessagePayload,
  account: ConnectedAccount,
): Promise<void> {
  const { watermark } = readData;
  const contactExternalId = messaging.sender.id;

  // Find or create contact
  const contact = await resolveContact(
    contactExternalId,
    account.encryptedAccessToken,
  );

  // Find the conversation
  const conversation = await InboxService.getConversation({
    connectedAccountId: account.id,
    contactId: contact.id,
    channel: "dm",
  });

  if (!conversation) {
    console.warn("[FB DM] Read receipt for non-existent conversation", {
      accountId: account.id,
      contactId: contact.id,
      watermark,
    });
    return;
  }

  // Update conversation metadata with read watermark
  const metadata = (conversation.metadata || {}) as Record<string, unknown>;
  const readTimestamp = new Date(watermark);

  if (!metadata.byPlatform) {
    metadata.byPlatform = {};
  }
  const byPlatform = metadata.byPlatform as Record<string, unknown>;

  if (!byPlatform.FACEBOOK) {
    byPlatform.FACEBOOK = {};
  }
  const fbMeta = byPlatform.FACEBOOK as Record<string, unknown>;

  if (!fbMeta.dm) {
    fbMeta.dm = {};
  }
  const dmMeta = fbMeta.dm as Record<string, unknown>;

  dmMeta.lastReadAt = readTimestamp.toISOString();
  dmMeta.lastReadWatermark = watermark;

  // Update conversation with new metadata using upsert
  await InboxService.upsertConversation({
    connectedAccountId: account.id,
    platform: Platform.enum.FACEBOOK,
    contactId: contact.id,
    lastMessageAt: conversation.lastMessageAt,
    channel: "dm",
    threadKey: contact.id,
    metadata,
  });

  // Dispatch conversation updated event to UI (includes updated metadata)
  const event = createWorkspaceEvent(
    InboxRealtimeEventTypes.ConversationUpserted,
    {
      conversationId: conversation.id,
      lastMessageAt: conversation.lastMessageAt,
      platform: Platform.enum.FACEBOOK,
      contact: {
        id: contact.id,
        name: contact.name,
        profilePicUrl: contact.profilePicUrl,
      },
    },
  );

  await dispatchWorkspaceEvent(account.workspaceId, event);

  console.info("[FB DM] Read receipt processed", {
    accountId: account.id,
    conversationId: conversation.id,
    watermark,
    lastReadAt: readTimestamp.toISOString(),
  });
}

/**
 * Handle message reaction event
 */
async function handleMessageReaction(
  reactionData: NonNullable<FBMessagePayload["reaction"]>,
  messaging: FBMessagePayload,
  account: ConnectedAccount,
  timestamp: number,
): Promise<void> {
  const { mid, action, reaction, emoji } = reactionData;
  const actorId = messaging.sender.id;

  const dbClient = db();

  // Find the message being reacted to
  const record = await findMessageRecord(dbClient, account.id, mid);

  if (!record) {
    console.warn("[FB DM] Reaction received for non-existent message", {
      accountId: account.id,
      mid,
      action,
    });
    return;
  }

  const metadata: InboxMessageMetadata = {
    ...(record.metadata ?? {}),
  };

  const reactionKey = emoji ?? reaction ?? "👍";
  const isoTimestamp = new Date(timestamp).toISOString();

  upsertReactionMetadata(metadata, record.channel, {
    platform: "FACEBOOK",
    mid,
    key: reactionKey,
    action: action === "unreact" ? "removed" : "added",
    actorId,
    timestamp: isoTimestamp,
    extras: {
      emoji: emoji ?? reaction,
    },
  });

  await InboxService.upsertMessage({
    inboxConversationId: record.conversationId,
    externalId: mid,
    text: record.text,
    payload: messaging,
    sender: record.sender,
    workspaceId: account.workspaceId,
    channel: record.channel,
    contentId: record.contentId,
    metadata,
  });

  const event = createWorkspaceEvent(InboxRealtimeEventTypes.MessageUpserted, {
    conversationId: record.conversationId,
    message: {
      id: "",
      externalId: mid,
      sender: record.sender,
      text: record.text,
      attachments: [],
      createdAt: new Date(),
      channel: record.channel,
      contentId: record.contentId,
      metadata,
    },
  });

  await dispatchWorkspaceEvent(account.workspaceId, event);

  console.info("[FB DM] Message reaction updated", {
    accountId: account.id,
    conversationId: record.conversationId,
    mid,
    action,
    reactionKey,
    actorId,
  });
}

/**
 * Find message record by external ID
 */
async function findMessageRecord(
  dbClient: ReturnType<typeof db>,
  connectedAccountId: string,
  externalId: string,
): Promise<{
  conversationId: string;
  channel: InboxChannel;
  sender: "user" | "self";
  text: string | null;
  metadata: InboxMessageMetadata;
  contentId: string | null;
} | null> {
  const [row] = await dbClient
    .select({
      conversationId: inboxConversationsTable.id,
      channel: inboxMessagesTable.channel,
      sender: inboxMessagesTable.sender,
      text: inboxMessagesTable.text,
      metadata: inboxMessagesTable.metadata,
      contentId: inboxMessagesTable.contentId,
    })
    .from(inboxMessagesTable)
    .innerJoin(
      inboxConversationsTable,
      eq(inboxMessagesTable.inboxConversationId, inboxConversationsTable.id),
    )
    .where(
      and(
        eq(inboxMessagesTable.externalId, externalId),
        eq(inboxConversationsTable.connectedAccountId, connectedAccountId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    conversationId: row.conversationId,
    channel: row.channel,
    sender: row.sender,
    text: row.text,
    metadata: (row.metadata ?? {}) as InboxMessageMetadata,
    contentId: row.contentId,
  };
}

/**
 * Dispatch conversation bump event
 */
async function dispatchConversationEvent(
  conversation: InboxConversation,
  contact: InboxContact,
  account: ConnectedAccount,
  timestamp: number,
): Promise<void> {
  const conversationEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.ConversationUpserted,
    {
      conversationId: conversation.id,
      lastMessageAt: new Date(timestamp),
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
