import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  type InboxChannel,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import type { AllPlatforms } from "@shared/content";
import { and, eq } from "drizzle-orm";

export type ConversationRow = {
  id: string;
  platform: AllPlatforms;
  channel: InboxChannel;
  lastMessageAt: Date;
  metadata: Record<string, unknown>;
  connectedAccountId: string;
  accessToken: string;
  contactExternalId: string | null;
};

type DbClient = ReturnType<typeof import("@core/database/db").getDbClient>;

export async function loadConversationForWorkspace(
  db: DbClient,
  conversationId: string,
  workspaceId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select({
      id: inboxConversationsTable.id,
      platform: inboxConversationsTable.platform,
      channel: inboxConversationsTable.channel,
      lastMessageAt: inboxConversationsTable.lastMessageAt,
      metadata: inboxConversationsTable.metadata,
      connectedAccountId: inboxConversationsTable.connectedAccountId,
      accessToken: connectedAccount.encryptedAccessToken,
      contactExternalId: inboxContactsTable.externalId,
    })
    .from(inboxConversationsTable)
    .innerJoin(
      connectedAccount,
      eq(inboxConversationsTable.connectedAccountId, connectedAccount.id),
    )
    .innerJoin(
      inboxContactsTable,
      eq(inboxConversationsTable.contactId, inboxContactsTable.id),
    )
    .where(
      and(
        eq(inboxConversationsTable.id, conversationId),
        eq(connectedAccount.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    platform: row.platform as AllPlatforms,
    channel: row.channel as InboxChannel,
    lastMessageAt: row.lastMessageAt,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    connectedAccountId: row.connectedAccountId as string,
    accessToken: row.accessToken as string,
    contactExternalId: row.contactExternalId ?? null,
  } satisfies ConversationRow;
}
