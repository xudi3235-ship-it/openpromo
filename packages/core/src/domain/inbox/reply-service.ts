import { facebookGraphRequest } from "@core/domain/content/entity/facebook/api";
import { instagramGraphRequest } from "@core/domain/content/entity/instagram/api";
import { UnifiedContent } from "@core/domain/content/unified-content";
import { getChannelMetadata } from "@core/domain/inbox/message-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { Actor } from "@core/helpers/actor";
import { getDbClient } from "@core/helpers/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { inboxContactsTable } from "@core/schemas/inbox-contacts.sql";
import {
  type InboxChannel,
  inboxConversationsTable,
} from "@core/schemas/inbox-conversations.sql";
import { env } from "@core/utils/env";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type { AllPlatforms } from "@shared/content";
import type { InboxMessageMetadata } from "@shared/inbox";
import { InboxRealtimeEventTypes } from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { and, eq } from "drizzle-orm";

type InboxReplyInput = {
  conversationId: string;
  text: string;
  replyToMessageId?: string | null;
};

type ConversationRow = {
  id: string;
  platform: AllPlatforms;
  channel: InboxChannel;
  externalThreadId: string | null;
  contentId: string | null;
  conversationMetadata: Record<string, unknown> | null;
  contactExternalId: string;
  accessToken: string;
  connectedAccountId: string;
};

export namespace InboxReplyService {
  export async function sendReply({
    conversationId,
    text,
    replyToMessageId,
  }: InboxReplyInput) {
    if (env.VITE_ENVIRONMENT === "local") {
      console.info("[Inbox Reply] local environment, skipping send", {
        conversationId,
      });
      return;
    }

    if (replyToMessageId) {
      console.info("[Inbox Reply] replying to message", {
        conversationId,
        replyToMessageId,
      });
    }

    const workspaceId = Actor.workspaceID();
    const db = getDbClient();

    const row = await loadConversation(db, workspaceId, conversationId);
    if (!row) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Conversation not found.",
      );
    }

    if (row.channel === "dm") {
      await sendDirectMessageReply(row, text, workspaceId);
    } else if (row.channel === "post_comment") {
      await sendCommentReply(row, text, workspaceId);
    } else {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_STATE,
        `Unsupported conversation channel: ${row.channel}`,
      );
    }
  }
}

async function loadConversation(
  db: ReturnType<typeof getDbClient>,
  workspaceId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const [row] = await db
    .select({
      id: inboxConversationsTable.id,
      platform: inboxConversationsTable.platform,
      channel: inboxConversationsTable.channel,
      externalThreadId: inboxConversationsTable.externalThreadId,
      contentId: inboxConversationsTable.contentId,
      conversationMetadata: inboxConversationsTable.metadata,
      contactExternalId: inboxContactsTable.externalId,
      accessToken: connectedAccount.encryptedAccessToken,
      connectedAccountId: connectedAccount.id,
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

  return row ?? null;
}

async function sendDirectMessageReply(
  row: ConversationRow,
  text: string,
  workspaceId: string,
) {
  if (row.platform === "INSTAGRAM") {
    console.info("[Inbox Reply][IG DM][1] sending message", {
      conversationId: row.id,
      connectedAccountId: row.connectedAccountId,
    });
    await instagramGraphRequest(
      {
        accessToken: row.accessToken,
        rateLimitKey: `instagram:${row.connectedAccountId}`,
      },
      `/me/messages`,
      {
        method: "POST",
        body: {
          recipient: { id: row.contactExternalId },
          message: { text },
        },
      },
    );
  } else if (row.platform === "FACEBOOK") {
    console.info("[Inbox Reply][FB DM][1] sending message", {
      conversationId: row.id,
      connectedAccountId: row.connectedAccountId,
    });
    await facebookGraphRequest(
      {
        accessToken: row.accessToken,
        rateLimitKey: `facebook:${row.connectedAccountId}`,
      },
      "/me/messages",
      {
        method: "POST",
        body: {
          recipient: { id: row.contactExternalId },
          messaging_type: "RESPONSE",
          message: { text },
        },
      },
    );
  } else {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.INVALID_STATE,
      `Unsupported DM platform: ${row.platform}`,
    );
  }

  await emitPendingReplyEvent(row.id, row.channel, workspaceId);
}

async function sendCommentReply(
  row: ConversationRow,
  text: string,
  workspaceId: string,
) {
  if (row.platform === "FACEBOOK") {
    await sendFacebookCommentReply({
      accessToken: row.accessToken,
      connectedAccountId: row.connectedAccountId,
      externalThreadId: row.externalThreadId,
      text,
      conversationId: row.id,
    });
    await emitPendingReplyEvent(row.id, row.channel, workspaceId);
    return;
  }

  if (row.platform === "INSTAGRAM") {
    await sendInstagramCommentReply({
      accessToken: row.accessToken,
      connectedAccountId: row.connectedAccountId,
      externalThreadId: row.externalThreadId,
      conversationMetadata: row.conversationMetadata ?? {},
      contentId: row.contentId,
      text,
      conversationId: row.id,
    });
    await emitPendingReplyEvent(row.id, row.channel, workspaceId);
    return;
  }

  throw new VisibleError(
    "validation",
    ErrorCodes.Validation.INVALID_STATE,
    `Unsupported channel for replies: ${row.platform}`,
  );
}

async function sendFacebookCommentReply(params: {
  accessToken: string;
  connectedAccountId: string;
  externalThreadId: string | null;
  text: string;
  conversationId: string;
}) {
  const {
    accessToken,
    connectedAccountId,
    externalThreadId,
    text,
    conversationId,
  } = params;

  if (!externalThreadId) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
      "Unable to reply: missing Facebook comment reference.",
    );
  }

  console.info("[Inbox Reply][FB Comment][1] replying to comment", {
    conversationId,
    externalThreadId,
  });

  await facebookGraphRequest(
    {
      accessToken,
      rateLimitKey: `facebook:${connectedAccountId}`,
    },
    `/${externalThreadId}/comments`,
    {
      method: "POST",
      body: {
        message: text,
      },
    },
  );
}

async function sendInstagramCommentReply(params: {
  accessToken: string;
  connectedAccountId: string;
  externalThreadId: string | null;
  conversationMetadata: Record<string, unknown>;
  contentId: string | null;
  text: string;
  conversationId: string;
}) {
  const {
    accessToken,
    connectedAccountId,
    externalThreadId,
    conversationMetadata,
    contentId,
    text,
    conversationId,
  } = params;

  const conversationMeta = (conversationMetadata ?? {}) as InboxMessageMetadata;
  const channelMeta = getChannelMetadata(
    conversationMeta,
    "INSTAGRAM",
    "post_comment",
  );
  const metadataMediaId = channelMeta?.extra?.mediaId;

  let targetId: string | null = externalThreadId ?? null;
  let endpointSuffix: "replies" | "comments" = "replies";

  if (!targetId && typeof metadataMediaId === "string") {
    targetId = metadataMediaId;
    endpointSuffix = "comments";
  }

  if (!targetId && contentId) {
    const content = await UnifiedContent.getByID(contentId).catch(() => null);
    if (content?.sourceContentId) {
      targetId = content.sourceContentId;
      endpointSuffix = "comments";
    }
  }

  if (!targetId) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
      "Unable to reply: missing Instagram comment reference.",
    );
  }

  console.info("[Inbox Reply][IG Comment][1] replying to comment", {
    conversationId,
    targetId,
    endpointSuffix,
  });

  await instagramGraphRequest(
    {
      accessToken,
      rateLimitKey: `instagram:${connectedAccountId}`,
    },
    `/${targetId}/${endpointSuffix}`,
    {
      method: "POST",
      body: {
        message: text,
      },
    },
  );
}

async function emitPendingReplyEvent(
  conversationId: string,
  channel: InboxChannel,
  workspaceId: string,
) {
  const pendingEvent = createWorkspaceEvent(
    InboxRealtimeEventTypes.MessageUpserted,
    {
      conversationId,
      message: {
        id: "",
        externalId: "",
        sender: "self",
        text: null,
        attachments: [],
        createdAt: new Date(),
        channel,
        contentId: null,
        metadata: { pendingEcho: true },
      },
    },
  );
  await dispatchWorkspaceEvent(workspaceId, pendingEvent);
}
