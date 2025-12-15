import { db } from "@core/database/db";
import { InboxService } from "@core/domain/inbox";
import {
  appendChannelExtra,
  setEditMetadata,
  upsertReactionMetadata,
} from "@core/domain/inbox/message-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
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
  console.log("[IG messages] handleInstagramMessageChanges START", {
    accountId: account.id,
    changesCount: rawChanges?.length ?? 0,
    rawChanges: JSON.stringify(rawChanges),
  });

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
    const change = parsed.data as any;

    console.log("[IG messages] Processing change", {
      accountId: account.id,
      field: change.field,
      value: change.value,
    });

    if (change.field === "message_edit") {
      await handleMessageEditChange(change, account, dbClient);
    } else if (change.field === "message_reactions") {
      console.log("[IG messages] Handling reaction change", {
        accountId: account.id,
        mid: change.value.mid,
        reaction: change.value.reaction,
        verb: change.value.verb,
        sender: change.value.sender,
      });
      await handleMessageReactionChange(change, account, dbClient);
    } else {
      console.warn("[IG messages] Unknown change field", {
        accountId: account.id,
        field: change.field,
      });
    }
  }

  console.log("[IG messages] handleInstagramMessageChanges COMPLETED", {
    accountId: account.id,
  });
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
  const timestamp = value.timestamp
    ? new Date(value.timestamp * 1000).toISOString()
    : new Date().toISOString();

  const editorId = value.from?.id ?? value.from?.username ?? null;
  const isSelf = editorId === account.externalAccountId;

  setEditMetadata(metadata, {
    at: timestamp,
    by: isSelf ? "self" : "other",
    text: value.text ?? undefined,
  });

  const extra: Record<string, unknown> = {};
  if (typeof value.num_edit === "number") {
    extra.numEdits = value.num_edit;
  }
  if (editorId) {
    extra.editorId = editorId;
  }
  if (Object.keys(extra).length > 0) {
    appendChannelExtra(metadata, "INSTAGRAM", record.channel, extra);
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

  console.log("[IG messages][reaction] START", {
    accountId: account.id,
    mid,
    reaction: value.reaction,
    verb: value.verb,
    sender: value.sender,
    timestamp: value.timestamp,
  });

  if (!mid) {
    console.warn("[IG messages][reaction] Missing mid", {
      accountId: account.id,
      value,
    });
    return;
  }

  const record = await findMessageRecord(dbClient, account.id, mid);
  if (!record) {
    console.warn("[IG messages][reaction] Message not found", {
      mid,
      accountId: account.id,
    });
    return;
  }

  console.log("[IG messages][reaction] Message found", {
    accountId: account.id,
    mid,
    conversationId: record.conversationId,
    channel: record.channel,
  });

  const metadata: InboxMessageMetadata = {
    ...(record.metadata ?? {}),
  };

  const actorId = value.sender?.id ?? value.sender?.username ?? undefined;
  const reaction = value.reaction;
  const verb = value.verb ?? "add";

  console.log("[IG messages][reaction] Processing reaction data", {
    accountId: account.id,
    mid,
    actorId,
    reaction,
    verb,
    hasActorId: !!actorId,
    hasReaction: !!reaction,
  });

  if (!actorId) {
    console.warn("[IG messages][reaction] Missing actorId", {
      accountId: account.id,
      mid,
      sender: value.sender,
    });
  }

  if (!reaction) {
    console.warn("[IG messages][reaction] Missing reaction", {
      accountId: account.id,
      mid,
      value,
    });
  }

  if (actorId && reaction) {
    const timestamp = value.timestamp
      ? new Date(value.timestamp * 1000).toISOString()
      : new Date().toISOString();

    console.log("[IG messages][reaction] Upserting reaction metadata", {
      accountId: account.id,
      mid,
      platform: "INSTAGRAM",
      key: reaction,
      action: verb === "remove" ? "removed" : "added",
      actorId,
      timestamp,
    });

    upsertReactionMetadata(metadata, record.channel, {
      platform: "INSTAGRAM",
      mid,
      key: reaction,
      action: verb === "remove" ? "removed" : "added",
      actorId,
      timestamp,
      extras: {
        senderId: value.sender?.id,
        senderUsername: value.sender?.username,
      },
    });

    console.log("[IG messages][reaction] Reaction metadata updated", {
      accountId: account.id,
      mid,
      metadataReactions:
        metadata.byPlatform?.["INSTAGRAM"]?.[record.channel]?.reactions
          ?.length ?? 0,
    });
  } else {
    console.warn(
      "[IG messages][reaction] Skipping reaction update - missing required fields",
      {
        accountId: account.id,
        mid,
        hasActorId: !!actorId,
        hasReaction: !!reaction,
      },
    );
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
