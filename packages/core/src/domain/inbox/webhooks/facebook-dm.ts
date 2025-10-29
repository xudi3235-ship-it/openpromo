import { facebookOAuthService } from "@core/domain/connected-account/facebook-oauth-service";
import { InboxService } from "@core/domain/inbox";
import {
  appendChannelExtra,
  setEditMetadata,
} from "@core/domain/inbox/message-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Platform } from "@core/schemas/connected-account.sql";
import type { FBMessagePayload, InboxMessageMetadata } from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";

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
  const { sender, recipient, message, message_edit, timestamp } = messaging;

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
