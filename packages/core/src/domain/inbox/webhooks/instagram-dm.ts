import { instagramOAuthService } from "@core/domain/connected-account";
import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Platform } from "@core/schemas/connected-account.sql";
import type { IGMessagePayload } from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";

type ConnectedAccount = Awaited<
  ReturnType<
    typeof import("@core/domain/connected-account/connected-account").ConnectedAccount.fromIGAccountID
  >
>;

/**
 * Handles Instagram Direct Message webhook events
 */
export async function handleInstagramDMEvents(
  messagingEvents: IGMessagePayload[],
  account: ConnectedAccount,
) {
  for (const messaging of messagingEvents) {
    try {
      await processDMEvent(messaging, account);
    } catch (error) {
      console.error("[IG DM] Failed to process messaging event", {
        accountId: account.id,
        senderId: messaging.sender?.id,
        error,
      });
      // Continue processing other events
    }
  }
}

async function processDMEvent(
  messaging: IGMessagePayload,
  account: ConnectedAccount,
) {
  const { sender, recipient, message, message_edit, read, timestamp } =
    messaging;

  // Handle read receipt events
  if (read) {
    await handleMessageRead(read, messaging, account);
    return;
  }

  if (!message && !message_edit) {
    console.warn("[IG DM] Event missing both message and message_edit", {
      accountId: account.id,
    });
    return;
  }

  // Determine contact external ID
  const contactExternalId = message?.is_echo ? recipient.id : sender.id;

  // 1. Resolve or create contact
  const contact = await resolveContact(contactExternalId, account);

  // 2. Get or create conversation
  const conversation = await resolveConversation(
    messaging,
    account,
    contact.id,
    timestamp,
  );

  // 3. Store or update message
  if (message_edit) {
    await handleMessageEdit(message_edit, messaging, conversation, account);
  } else if (message) {
    await handleNewMessage(
      message,
      messaging,
      conversation,
      account,
      timestamp,
    );
  }

  // 4. Dispatch conversation update event
  await dispatchConversationEvent(conversation.id, timestamp, contact, account);
}

/**
 * Handle message read receipt event
 */
async function handleMessageRead(
  readData: NonNullable<IGMessagePayload["read"]>,
  messaging: IGMessagePayload,
  account: ConnectedAccount,
): Promise<void> {
  const { watermark } = readData;
  const contactExternalId = messaging.sender.id;

  // Find or create contact
  const contact = await resolveContact(contactExternalId, account);

  // Find the conversation
  const conversation = await InboxService.getConversation({
    connectedAccountId: account.id,
    contactId: contact.id,
    channel: "dm",
  });

  if (!conversation) {
    console.warn("[IG DM] Read receipt for non-existent conversation", {
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

  if (!byPlatform.INSTAGRAM) {
    byPlatform.INSTAGRAM = {};
  }
  const igMeta = byPlatform.INSTAGRAM as Record<string, unknown>;

  if (!igMeta.dm) {
    igMeta.dm = {};
  }
  const dmMeta = igMeta.dm as Record<string, unknown>;

  dmMeta.lastReadAt = readTimestamp.toISOString();
  dmMeta.lastReadWatermark = watermark;

  // Update conversation with new metadata using upsert
  await InboxService.upsertConversation({
    connectedAccountId: account.id,
    platform: Platform.enum.INSTAGRAM,
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
      platform: Platform.enum.INSTAGRAM,
      contact: {
        id: contact.id,
        name: contact.name,
        profilePicUrl: contact.profilePicUrl,
      },
    },
  );

  await dispatchWorkspaceEvent(account.workspaceId, event);

  console.info("[IG DM] Read receipt processed", {
    accountId: account.id,
    conversationId: conversation.id,
    watermark,
    lastReadAt: readTimestamp.toISOString(),
  });
}

/**
 * Resolves an Instagram contact, creating if necessary
 */
async function resolveContact(externalId: string, account: ConnectedAccount) {
  // Try to find existing contact
  let contact = await InboxService.findContact({
    platform: Platform.enum.INSTAGRAM,
    externalId,
  });

  if (contact) {
    return contact;
  }

  // Fetch profile from Instagram API
  try {
    const profile = await instagramOAuthService.getUserProfile(
      account.encryptedAccessToken,
      externalId,
    );

    contact = await InboxService.createContact({
      platform: Platform.enum.INSTAGRAM,
      externalId,
      name: profile.name || profile.username,
      profilePicUrl: profile.profile_pic || "",
    });

    console.info("[IG DM] Created new contact", {
      accountId: account.id,
      contactId: contact.id,
      externalId,
    });

    return contact;
  } catch (error) {
    console.error("[IG DM] Failed to fetch Instagram profile", {
      accountId: account.id,
      externalId,
      error,
    });

    // Fallback: create contact with minimal info
    contact = await InboxService.createContact({
      platform: Platform.enum.INSTAGRAM,
      externalId,
      name: `Instagram User (${externalId.slice(-6)})`,
      profilePicUrl: "",
    });

    return contact;
  }
}

/**
 * Resolves a conversation, creating if necessary
 */
async function resolveConversation(
  messaging: IGMessagePayload,
  account: ConnectedAccount,
  contactId: string,
  timestamp: number,
) {
  const { message_edit } = messaging;

  // If this is an edit, try to find existing conversation
  if (message_edit) {
    const existing = await InboxService.getConversation({
      connectedAccountId: account.id,
      contactId,
      channel: "dm",
    });

    if (existing) {
      return existing;
    }
  }

  // Create or update conversation
  return await InboxService.upsertConversation({
    connectedAccountId: account.id,
    platform: Platform.enum.INSTAGRAM,
    contactId,
    lastMessageAt: new Date(timestamp),
    channel: "dm",
    threadKey: contactId,
  });
}

/**
 * Handles a message edit event
 */
async function handleMessageEdit(
  messageEdit: NonNullable<IGMessagePayload["message_edit"]>,
  messaging: IGMessagePayload,
  conversation: Awaited<ReturnType<typeof InboxService.upsertConversation>>,
  account: ConnectedAccount,
) {
  const { message } = messaging;

  await InboxService.upsertMessage({
    inboxConversationId: conversation.id,
    externalId: messageEdit.mid,
    text: messageEdit.text,
    payload: messaging,
    sender: message?.is_echo ? "self" : "user",
    workspaceId: account.workspaceId,
    channel: conversation.channel,
  });

  const event = createWorkspaceEvent(InboxRealtimeEventTypes.MessageUpserted, {
    conversationId: conversation.id,
    message: {
      id: "",
      externalId: messageEdit.mid,
      sender: message?.is_echo ? "self" : "user",
      text: messageEdit.text,
      attachments: [],
      createdAt: new Date(messaging.timestamp),
      channel: conversation.channel,
      contentId: null,
      metadata: {},
    },
  });

  await dispatchWorkspaceEvent(account.workspaceId, event);

  console.info("[IG DM] Message edited", {
    accountId: account.id,
    conversationId: conversation.id,
    messageId: messageEdit.mid,
  });
}

/**
 * Handles a new message event
 */
async function handleNewMessage(
  message: NonNullable<IGMessagePayload["message"]>,
  messaging: IGMessagePayload,
  conversation: Awaited<ReturnType<typeof InboxService.upsertConversation>>,
  account: ConnectedAccount,
  timestamp: number,
) {
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
      id: "",
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

  console.info("[IG DM] New message created", {
    accountId: account.id,
    conversationId: conversation.id,
    messageId: message.mid,
    hasAttachments: attachments.length > 0,
    isEcho: message.is_echo,
  });
}

/**
 * Dispatches a conversation update event
 */
async function dispatchConversationEvent(
  conversationId: string,
  timestamp: number,
  contact: Awaited<ReturnType<typeof InboxService.findContact>>,
  account: ConnectedAccount,
) {
  if (!contact) return;

  const event = createWorkspaceEvent(
    InboxRealtimeEventTypes.ConversationUpserted,
    {
      conversationId,
      lastMessageAt: new Date(timestamp),
      platform: Platform.enum.INSTAGRAM,
      contact: {
        id: contact.id,
        name: contact.name,
        profilePicUrl: contact.profilePicUrl,
      },
    },
  );

  await dispatchWorkspaceEvent(account.workspaceId, event);
}
