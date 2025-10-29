import type { InboxChannel } from "@core/schemas/inbox-conversations.sql";
import type {
  InboxChannelMetadata,
  InboxMessageEdit,
  InboxMessageMetadata,
  InboxMessageReaction,
  InboxPlatformMetadata,
} from "@shared/inbox";

type ReactionPlatform = InboxMessageReaction["platform"];

function ensureByPlatform(
  metadata: InboxMessageMetadata,
  platform: ReactionPlatform,
): InboxPlatformMetadata {
  if (!metadata.byPlatform) {
    metadata.byPlatform = {};
  }
  const existing = metadata.byPlatform[platform];
  if (existing) {
    return existing;
  }
  const created: InboxPlatformMetadata = {};
  metadata.byPlatform[platform] = created;
  return created;
}

export function ensureChannelMetadata(
  metadata: InboxMessageMetadata,
  platform: ReactionPlatform,
  channel: InboxChannel,
): InboxChannelMetadata {
  const platformMeta = ensureByPlatform(metadata, platform);
  const existing = platformMeta[channel];
  if (existing) {
    return existing;
  }
  const created: InboxChannelMetadata = {};
  platformMeta[channel] = created;
  return created;
}

export function upsertReactionMetadata(
  metadata: InboxMessageMetadata,
  channel: InboxChannel,
  reaction: InboxMessageReaction,
) {
  const channelMeta = ensureChannelMetadata(
    metadata,
    reaction.platform,
    channel,
  );

  const existing = channelMeta.reactions ?? [];
  const filtered = existing.filter(
    (entry) =>
      !(
        entry.actorId === reaction.actorId &&
        entry.key === reaction.key &&
        entry.platform === reaction.platform
      ),
  );

  if (reaction.action !== "removed") {
    filtered.push(reaction);
  }

  if (filtered.length > 0) {
    channelMeta.reactions = filtered;
  } else {
    delete channelMeta.reactions;
  }
}

export function setEditMetadata(
  metadata: InboxMessageMetadata,
  edit: InboxMessageEdit,
) {
  metadata.edit = {
    at: edit.at,
    by: edit.by,
    ...(edit.text ? { text: edit.text } : {}),
  };
}

export function getChannelMetadata(
  metadata: InboxMessageMetadata | null | undefined,
  platform: ReactionPlatform,
  channel: InboxChannel,
): InboxChannelMetadata | null {
  const platformMeta = metadata?.byPlatform?.[platform];
  if (!platformMeta) return null;
  return platformMeta[channel] ?? null;
}

export function appendChannelExtra(
  metadata: InboxMessageMetadata,
  platform: ReactionPlatform,
  channel: InboxChannel,
  extra: Record<string, unknown>,
) {
  const channelMeta = ensureChannelMetadata(metadata, platform, channel);
  channelMeta.extra = {
    ...(channelMeta.extra ?? {}),
    ...extra,
  };
}
