import { and, db, eq } from "@core/helpers/db";
import type { Platform } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import {
  type InboxMessageSender,
  inboxMessagesTable,
  type MessageAttachment,
} from "@core/schemas/inbox-messages.sql";
import { Log } from "@core/utils/log";
import type { MessagePayload } from "@shared/inbox";

const log = Log.create({ namespace: "InboxService" });

export namespace InboxService {
  export async function getConversation(input: {
    connectedAccountId: string;
    contactId: string;
  }) {
    const [existing] = await db()
      .select()
      .from(inboxConversationsTable)
      .where(
        and(
          eq(
            inboxConversationsTable.connectedAccountId,
            input.connectedAccountId,
          ),
          eq(inboxConversationsTable.contactId, input.contactId),
        ),
      )
      .limit(1);
    return existing ?? null;
  }
  export async function findContact(input: {
    platform: Platform;
    externalId: string;
  }) {
    const [existing] = await db()
      .select()
      .from(inboxContactsTable)
      .where(
        and(
          eq(inboxContactsTable.platform, input.platform),
          eq(inboxContactsTable.externalId, input.externalId),
        ),
      )
      .limit(1);
    const found = existing ?? null;
    log.info("findContact", {
      platform: input.platform,
      externalId: input.externalId,
      found: !!found,
    });
    return found;
  }

  export async function createContact(input: {
    platform: Platform;
    externalId: string;
    name: string;
    profilePicUrl: string;
  }) {
    const [created] = await db()
      .insert(inboxContactsTable)
      .values({
        platform: input.platform,
        externalId: input.externalId,
        name: input.name,
        profilePicUrl: input.profilePicUrl,
      })
      .returning();
    log.info("createContact", {
      platform: input.platform,
      externalId: input.externalId,
      name: input.name,
    });
    return created;
  }

  export async function upsertConversation(input: {
    connectedAccountId: string;
    platform: Platform;
    contactId: string;
    lastMessageAt: Date;
  }) {
    const [row] = await db()
      .insert(inboxConversationsTable)
      .values({
        connectedAccountId: input.connectedAccountId,
        contactId: input.contactId,
        platform: input.platform,
        lastMessageAt: input.lastMessageAt,
        threadKey: input.contactId, // for DMs, threadKey is contactId
      })
      .onConflictDoUpdate({
        target: [
          inboxConversationsTable.connectedAccountId,
          inboxConversationsTable.contactId,
        ],
        set: { lastMessageAt: input.lastMessageAt },
      })
      .returning();
    log.info("upsertConversation", {
      connectedAccountId: input.connectedAccountId,
      contactId: input.contactId,
    });
    return row;
  }

  export async function upsertMessage(input: {
    inboxConversationId: string;
    externalId: string;
    senderContactId: string;
    text?: string | null;
    attachments?: MessageAttachment[];
    payload: MessagePayload;
    sender: InboxMessageSender;
  }) {
    const [created] = await db()
      .insert(inboxMessagesTable)
      .values({
        inboxConversationId: input.inboxConversationId,
        externalId: input.externalId,
        sender: input.sender,
        text: input.text,
        attachments: input.attachments ?? [],
        payload: input.payload,
      })
      .onConflictDoUpdate({
        target: [
          inboxMessagesTable.inboxConversationId,
          inboxMessagesTable.externalId,
        ],
        set: {
          text: input.text,
          payload: input.payload,
          ...(input.attachments ? { attachments: input.attachments } : {}),
        },
      })
      .returning();
    log.info("upsertMessage", {
      inboxConversationId: input.inboxConversationId,
      externalId: input.externalId,
      sender: input.sender,
      text: input.text,
      attachmentCount: input.attachments?.length ?? 0,
    });
    return created;
  }
}
