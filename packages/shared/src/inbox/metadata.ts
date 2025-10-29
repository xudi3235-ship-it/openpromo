import * as z from "zod";

const ReactionPlatform = z.enum(["FACEBOOK", "INSTAGRAM"]);

export const InboxMessageReactionSchema = z.object({
  platform: ReactionPlatform,
  mid: z.string(),
  key: z.string(),
  action: z.enum(["added", "removed"]),
  actorId: z.string(),
  timestamp: z.string(),
  emoji: z.string().optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
});
export type InboxMessageReaction = z.infer<typeof InboxMessageReactionSchema>;

export const InboxMessageEditSchema = z.object({
  at: z.string(),
  by: z.enum(["self", "other"]),
  text: z.string().optional(),
});
export type InboxMessageEdit = z.infer<typeof InboxMessageEditSchema>;

export const InboxChannelMetadataSchema = z.object({
  reactions: z.array(InboxMessageReactionSchema).optional(),
  lastSyncedAt: z.string().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});
export type InboxChannelMetadata = z.infer<typeof InboxChannelMetadataSchema>;

export const InboxPlatformMetadataSchema = z
  .object({
    dm: InboxChannelMetadataSchema.optional(),
    post_comment: InboxChannelMetadataSchema.optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .partial();
export type InboxPlatformMetadata = z.infer<typeof InboxPlatformMetadataSchema>;

export const InboxMessageMetadataSchema = z.object({
  optimistic: z.boolean().optional(),
  pendingEcho: z.boolean().optional(),
  deleted: z.boolean().optional(),
  edit: InboxMessageEditSchema.optional(),
  byPlatform: z
    .object({
      FACEBOOK: InboxPlatformMetadataSchema.optional(),
      INSTAGRAM: InboxPlatformMetadataSchema.optional(),
      TIKTOK: InboxPlatformMetadataSchema.optional(),
    })
    .partial()
    .optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type InboxMessageMetadata = z.infer<typeof InboxMessageMetadataSchema>;
