import { AllPlatforms, AllPlatformsZod } from "@shared/content";
import * as z from "zod";
import {
  type ContentPreview,
  ContentPreviewSchema,
} from "../content/content-preview";
import { InboxChannel as InboxChannelSchema } from "./channels";
import { InboxMessageMetadataSchema } from "./metadata";

export { ContentPreviewSchema as PostPreviewSchema } from "../content/content-preview";

export const FBMessageAttachmentTypes = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
  REEL: "reel",
  IG_REEL: "ig_reel",
} as const;

export const IGMessageAttachmentTypes = {
  ...FBMessageAttachmentTypes,
  SHARE: "share",
  STORY_MENTION: "story_mention",
} as const;

export const AllMessageAttachmentTypes = {
  ...FBMessageAttachmentTypes,
  ...IGMessageAttachmentTypes,
} as const;

export const FBMessagePayload = z.object({
  sender: z.object({
    /** PSID - Page-scoped ID for the user who sent the message */
    id: z.string(),
  }),
  recipient: z.object({
    /** Page ID */
    id: z.string(),
  }),
  timestamp: z.number(),
  message: z
    .object({
      is_echo: z.boolean().optional(),
      mid: z.string(),
      text: z.string().optional(),
      reply_to: z
        .object({
          mid: z.string(),
        })
        .optional(),
      attachments: z
        .array(
          z.object({
            type: z.enum(FBMessageAttachmentTypes),
            payload: z.object({ url: z.string() }),
          }),
        )
        .optional(),
    })
    .optional(),
  message_edit: z
    .object({
      mid: z.string(),
      text: z.string(),
      num_edit: z.number(),
    })
    .optional(),
  reaction: z
    .object({
      mid: z.string(),
      action: z.enum(["react", "unreact"]),
      emoji: z.string().optional(),
      reaction: z.string().optional(),
    })
    .optional(),
  read: z
    .object({
      watermark: z.number(),
    })
    .optional(),
});

export const FBCommentPayload = z.object({
  post: z.object({
    id: z.string(),
    permalink_url: z.string(),
  }),
  from: z.object({
    id: z.string(),
    name: z.string(),
  }),
  message: z.string(),
  post_id: z.string(),
  comment_id: z.string(),
  parent_id: z.string(),
  verb: z.enum(["add", "edited", "remove"]),
  created_time: z.number(),
});

export const FBWebhookPayload = z.object({
  object: z.literal("page"),
  entry: z.array(
    z.union([
      z.object({
        /** Page ID */
        id: z.string(),
        messaging: z.array(FBMessagePayload),
      }),
      z.object({
        /** Page ID */
        id: z.string(),
        changes: z.array(
          z.object({
            field: z.literal("feed"),
            value: FBCommentPayload,
          }),
        ),
      }),
    ]),
  ),
});

export type FBMessagePayload = z.infer<typeof FBMessagePayload>;
export type FBWebhookPayload = z.infer<typeof FBWebhookPayload>;
export type FBCommentPayload = z.infer<typeof FBCommentPayload>;

export const IGMessagePayload = z.object({
  sender: z.object({
    /** IGSID - Instagram-scoped ID for the user who sent the message */
    id: z.string(),
  }),
  recipient: z.object({
    /** IGID - ID of the Instagram professional account */
    id: z.string(),
  }),
  timestamp: z.number(),
  reply_to: z
    .union([
      z.object({
        mid: z.string(),
      }),
      z.object({
        story: z.object({
          id: z.string(),
          url: z.string(),
        }),
      }),
    ])
    .optional(),
  message: z
    .object({
      is_echo: z.boolean().optional(),
      mid: z.string(),
      text: z.string().optional(),
      attachments: z
        .array(
          z.object({
            type: z.enum(IGMessageAttachmentTypes),
            payload: z.object({ url: z.string() }),
          }),
        )
        .optional(),
    })
    .optional(),
  message_edit: z
    .object({
      mid: z.string(),
      text: z.string(),
      num_edit: z.number(),
    })
    .optional(),
  read: z
    .object({
      watermark: z.number(),
    })
    .optional(),
});

export const IGCommentPayload = z.object({
  field: z.literal("comments"),
  value: z.object({
    id: z.string().optional(),
    comment_id: z.string().optional(),
    parent_id: z.string().optional(),
    text: z.string().optional(),
    created_time: z.number().optional(),
    timestamp: z.number().optional(),
    verb: z.string().optional(),
    from: z
      .object({
        id: z.string().optional(),
        username: z.string().optional(),
        self_ig_scoped_id: z.string().optional(),
      })
      .partial()
      .optional(),
    media: z
      .object({
        id: z.string().optional(),
        media_product_type: z.string().optional(),
        ad_id: z.string().optional(),
        ad_title: z.string().optional(),
        original_media_id: z.string().optional(),
      })
      .partial()
      .optional(),
  }),
});

export const IGMessageEditPayload = z.object({
  field: z.literal("message_edit"),
  value: z.object({
    mid: z.string(),
    text: z.string().optional().nullable(),
    num_edit: z.number().optional(),
    timestamp: z.number().optional(),
    from: z
      .object({
        id: z.string().optional(),
        username: z.string().optional(),
      })
      .partial()
      .optional(),
  }),
});

export const IGMessageReactionPayload = z.object({
  field: z.literal("message_reactions"),
  value: z.object({
    mid: z.string(),
    reaction: z.string().optional(),
    verb: z.enum(["add", "remove"]).optional(),
    timestamp: z.number().optional(),
    sender: z
      .object({
        id: z.string().optional(),
        username: z.string().optional(),
      })
      .partial()
      .optional(),
  }),
});

export const IGMessageChangePayload = z.union([
  IGMessageEditPayload,
  IGMessageReactionPayload,
]);

const IGChangePayload = z.union([IGCommentPayload, IGMessageChangePayload]);

const IGWebhookPayload = z.object({
  object: z.literal("instagram"),
  entry: z.array(
    z.object({
      /** IGID - ID of the Instagram professional account */
      id: z.string(),
      messaging: z.array(IGMessagePayload).optional(),
      changes: z.array(IGChangePayload).optional(),
    }),
  ),
});

export type IGMessagePayload = z.infer<typeof IGMessagePayload>;
export type IGCommentPayloadType = z.infer<typeof IGCommentPayload>;
export type IGMessageEditPayloadType = z.infer<typeof IGMessageEditPayload>;
export type IGMessageReactionPayloadType = z.infer<
  typeof IGMessageReactionPayload
>;
export type IGMessageChangePayloadType = z.infer<typeof IGMessageChangePayload>;
export type IGChangePayloadType = z.infer<typeof IGChangePayload>;
export type IGWebhookPayload = z.infer<typeof IGWebhookPayload>;

// MessagePayload now includes FB comments as well for unified storage
export const MessagePayload = z.union([
  FBMessagePayload,
  IGMessagePayload,
  FBCommentPayload,
  IGCommentPayload,
  IGMessageEditPayload,
  IGMessageReactionPayload,
]);

export type MessagePayload = z.infer<typeof MessagePayload>;

// ===== Unified Inbox API/Realtime shared types =====

// Keep platform strings aligned with core connected-account Platform

export * from "./channels";
export type {
  InboxChannelMetadata,
  InboxMessageEdit,
  InboxMessageMetadata,
  InboxMessageReaction,
  InboxPlatformMetadata,
} from "./metadata";
export {
  InboxChannelMetadataSchema,
  InboxMessageEditSchema,
  InboxMessageMetadataSchema,
  InboxMessageReactionSchema,
  InboxPlatformMetadataSchema,
} from "./metadata";

export const InboxAttachment = z.object({
  type: z.enum(AllMessageAttachmentTypes),
  url: z.string(),
});
export type InboxAttachment = z.infer<typeof InboxAttachment>;

export const InboxMessageSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  sender: z.enum(["user", "self"]),
  channel: InboxChannelSchema,
  text: z.string().nullable(),
  attachments: z.array(InboxAttachment),
  createdAt: z.coerce.date(),
  contentId: z.string().nullable(),
  metadata: InboxMessageMetadataSchema.optional().default({}),
});
export type InboxMessage = z.infer<typeof InboxMessageSchema>;

export const InboxContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePicUrl: z.string(),
});
export type InboxContact = z.infer<typeof InboxContactSchema>;

export const InboxConnectedAccountSummary = z.object({
  id: z.string(),
  accountName: z.string().nullable(),
});
export type InboxConnectedAccountSummary = z.infer<
  typeof InboxConnectedAccountSummary
>;

export const InboxConversationSummarySchema = z.object({
  id: z.string(),
  platform: AllPlatformsZod,
  channel: InboxChannelSchema,
  lastMessageAt: z.coerce.date(),
  contact: InboxContactSchema,
  connectedAccount: InboxConnectedAccountSummary,
  contentId: z.string().nullable(),
  externalThreadId: z.string().nullable(),
  postPreview: ContentPreviewSchema.optional(),
});
export type InboxConversationSummary = z.infer<
  typeof InboxConversationSummarySchema
>;
export type InboxPostPreview = ContentPreview;

// ============ Inbox Realtime Events ============
// Note: Inbox event types, schemas, and helpers have been consolidated
// into @shared/workspace/events for better type safety and reusability.
// See WorkspaceEventSchema and createWorkspaceEvent in workspace/events.ts

/**
 * Inbox realtime event types
 * These events are dispatched through WorkspacePusher for real-time inbox updates
 */
export enum InboxRealtimeEventTypes {
  ConversationUpserted = "inbox.conversation.upserted",
  MessageUpserted = "inbox.message.upserted",
}

/**
 * Event fired when a conversation is created or updated
 */
export const InboxConversationUpsertedEventSchema = z.object({
  type: z.literal(InboxRealtimeEventTypes.ConversationUpserted),
  conversationId: z.string(),
  lastMessageAt: z.coerce.date(),
  platform: AllPlatforms,
  contact: InboxContactSchema,
  timestamp: z.number(),
});

export type InboxConversationUpsertedEvent = z.infer<
  typeof InboxConversationUpsertedEventSchema
>;

/**
 * Event fired when a message is created or updated
 */
export const InboxMessageUpsertedEventSchema = z.object({
  type: z.literal(InboxRealtimeEventTypes.MessageUpserted),
  conversationId: z.string(),
  message: InboxMessageSchema,
  timestamp: z.number(),
});

export type InboxMessageUpsertedEvent = z.infer<
  typeof InboxMessageUpsertedEventSchema
>;
