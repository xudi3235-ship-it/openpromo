import type { Platform } from "@core/schemas/connected-account.sql";
import type { InboxChannel } from "@core/schemas/inbox-conversations.sql";

/**
 * Compute unread status for a conversation based on lastMessageAt and metadata
 */
export function computeUnreadStatus(conversation: {
  lastMessageAt: Date;
  metadata: Record<string, unknown>;
  platform: Platform;
  channel: InboxChannel;
}): { isUnread: boolean; lastReadAt: Date | null } {
  const metadata = conversation.metadata;
  const byPlatform = metadata.byPlatform as Record<string, unknown> | undefined;

  if (!byPlatform) {
    return { isUnread: true, lastReadAt: null };
  }

  const platformKey = conversation.platform.toUpperCase();
  const platformMeta = byPlatform[platformKey] as
    | Record<string, unknown>
    | undefined;

  if (!platformMeta) {
    return { isUnread: true, lastReadAt: null };
  }

  const channelMeta = platformMeta[conversation.channel] as
    | Record<string, unknown>
    | undefined;
  const lastReadAtStr = channelMeta?.lastReadAt as string | undefined;

  if (!lastReadAtStr) {
    return { isUnread: true, lastReadAt: null };
  }

  const lastReadAt = new Date(lastReadAtStr);

  // Validate that the date is valid
  if (Number.isNaN(lastReadAt.getTime())) {
    return { isUnread: true, lastReadAt: null };
  }

  const isUnread = conversation.lastMessageAt > lastReadAt;

  return { isUnread, lastReadAt };
}

/**
 * Update conversation metadata with read timestamp
 */
export function updateReadTimestamp(
  metadata: Record<string, unknown>,
  platform: Platform,
  channel: InboxChannel,
  timestamp: Date,
): Record<string, unknown> {
  const updatedMetadata = { ...metadata };

  if (!updatedMetadata.byPlatform) {
    updatedMetadata.byPlatform = {};
  }
  const byPlatform = updatedMetadata.byPlatform as Record<string, unknown>;

  const platformKey = platform.toUpperCase();
  if (!byPlatform[platformKey]) {
    byPlatform[platformKey] = {};
  }
  const platformMeta = byPlatform[platformKey] as Record<string, unknown>;

  if (!platformMeta[channel]) {
    platformMeta[channel] = {};
  }
  const channelMeta = platformMeta[channel] as Record<string, unknown>;

  channelMeta.lastReadAt = timestamp.toISOString();
  channelMeta.lastReadWatermark = timestamp.getTime();

  return updatedMetadata;
}
