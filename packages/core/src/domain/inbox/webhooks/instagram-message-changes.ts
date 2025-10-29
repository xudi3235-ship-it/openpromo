import { InboxService } from "@core/domain/inbox";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { db } from "@core/helpers/db";
import {
  type InboxChannel,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import {
  type InboxMessageMetadata,
  inboxMessagesTable,
} from "@core/schemas/inbox-messages.sql";
import type {
  IGMessageEditPayloadType,
  IGMessageReactionPayloadType,
} from "@shared/inbox";
import { IGMessageChangePayload, InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { and, eq } from "drizzle-orm";

type MessageRecord = {
  conversationId: string;
  channel: InboxChannel;
  sender: "user" | "self";
  text: string | null;
  metadata: InboxMessageMetadata;
  contentId: string | null;
};

export async function handleInstagramMessageChanges(
  rawChanges: unknown[],
  account: Awaited<
    ReturnType<
      typeof import("@core/domain/connected-account/connected-account").ConnectedAccount.fromIGAccountID
    >
  >,
) {
  const dbClient = db();

  for (const rawChange of rawChanges ?? []) {
    const parsed = IGMessageChangePayload.safeParse(rawChange);
    if (!parsed.success) {
      console.warn("[IG messages][0] failed to parse change", {
        accountId: account.id,
        rawChange,
        error: parsed.error.flatten(),
      });
      continue;
    }
    const change = parsed.data;

    if (change.field === "message_edit") {
      await handleMessageEditChange(change, account, dbClient);
    } else if (change.field === "message_reactions") {
      await handleMessageReactionChange(change, account, dbClient);
    }
  }
}

async function handleMessageEditChange(
  change: IGMessageEditPayloadType,
  account: Awaited<
    ReturnType<
      typeof import("@core/domain/connected-account/connected-account").ConnectedAccount.fromIGAccountID
    >
  >,
  dbClient: ReturnType<typeof db>,
) {
  const { value } = change;
  const mid = value.mid;
  if (!mid) return;

  const record = await findMessageRecord(dbClient, account.id, mid);
  if (!record) {
    console.warn("instagram message_edit change without existing message", {
      mid,
      accountId: account.id,
    });
    return;
  }

  const metadata: InboxMessageMetadata = {
    ...(record.metadata ?? {}),
  };
  if (typeof value.num_edit === "number") {
    metadata.numEdits = value.num_edit;
  }
  if (value.timestamp) {
    metadata.lastEditAt = new Date(value.timestamp * 1000).toISOString();
  }

  await InboxService.upsertMessage({
    inboxConversationId: record.conversationId,
    externalId: mid,
    text: value.text ?? null,
    payload: change,
    sender: record.sender,
    workspaceId: account.workspaceId,
    channel: record.channel,
    contentId: record.contentId,
    metadata,
  });

  const messageEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId: record.conversationId,
      message: {
        id: "",
        externalId: mid,
        sender: record.sender,
        text: value.text ?? null,
        attachments: [],
        createdAt: new Date(),
        channel: record.channel,
        contentId: record.contentId,
        metadata,
      },
    },
  );
  await dispatchWorkspaceEvent(account.workspaceId, messageEvent);

  console.info("[IG messages][edit] applied edit", {
    accountId: account.id,
    conversationId: record.conversationId,
    mid,
    textChanged: value.text ?? null,
    numEdit: value.num_edit,
  });
}

async function handleMessageReactionChange(
  change: IGMessageReactionPayloadType,
  account: Awaited<
    ReturnType<
      typeof import("@core/domain/connected-account/connected-account").ConnectedAccount.fromIGAccountID
    >
  >,
  dbClient: ReturnType<typeof db>,
) {
  const { value } = change;
  const mid = value.mid;
  if (!mid) return;

  const record = await findMessageRecord(dbClient, account.id, mid);
  if (!record) {
    console.warn(
      "instagram message_reactions change without existing message",
      {
        mid,
        accountId: account.id,
      },
    );
    return;
  }

  const metadata: InboxMessageMetadata = {
    ...(record.metadata ?? {}),
  };

  const existingReactions = Array.isArray(metadata.reactions)
    ? (metadata.reactions as Array<Record<string, unknown>>)
    : [];

  const actorId = value.sender?.id ?? value.sender?.username ?? undefined;
  const reaction = value.reaction;
  const verb = value.verb ?? "add";

  if (actorId && reaction) {
    const filtered = existingReactions.filter(
      (entry) => entry.actorId !== actorId,
    );
    if (verb !== "remove") {
      filtered.push({
        actorId,
        reaction,
        timestamp: value.timestamp
          ? new Date(value.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      });
    }
    metadata.reactions = filtered;
  }

  await InboxService.upsertMessage({
    inboxConversationId: record.conversationId,
    externalId: mid,
    text: record.text,
    payload: change,
    sender: record.sender,
    workspaceId: account.workspaceId,
    channel: record.channel,
    contentId: record.contentId,
    metadata,
  });

  const messageEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
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
    },
  );
  await dispatchWorkspaceEvent(account.workspaceId, messageEvent);

  console.info("[IG messages][reaction] updated reactions", {
    accountId: account.id,
    conversationId: record.conversationId,
    mid,
    verb,
    reaction,
    actorId,
  });
}

async function findMessageRecord(
  dbClient: ReturnType<typeof db>,
  connectedAccountId: string,
  externalId: string,
): Promise<MessageRecord | null> {
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
