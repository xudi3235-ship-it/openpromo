import { AllPlatformsZod } from "@shared/content";
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
            type: z.enum([
              "image",
              "video",
              "audio",
              "file",
              "reel",
              "ig_reel",
            ]),
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
            type: z.enum([
              "image",
              "video",
              "audio",
              "file",
              "reel",
              "ig_reel",
              "share",
              "story_mention",
            ]),
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

const TikTokCommentUpdateBase = z
  .object({
    event_type: z.literal("comment.update"),
    business_id: z.string(),
    video_id: z.string(),
    comment_id: z.string(),
    parent_comment_id: z.string().optional(),
    comment_action: z.string().optional(),
    event_time: z.number().optional(),
  })
  .passthrough();

export const TikTokCommentUpdateEvent = z
  .union([
    TikTokCommentUpdateBase,
    z
      .object({
        event_type: z.literal("comment.update"),
        data: TikTokCommentUpdateBase,
      })
      .passthrough(),
  ])
  .transform((value) =>
    "data" in value
      ? (value.data as z.infer<typeof TikTokCommentUpdateBase>)
      : (value as z.infer<typeof TikTokCommentUpdateBase>),
  );

export const TikTokBusinessCommentPayload = z.object({
  platform: z.literal("tiktok_business"),
  eventType: z.literal("comment.update"),
  businessId: z.string(),
  videoId: z.string(),
  commentId: z.string(),
  commentAction: z.string().optional(),
  comment: z.object({
    comment_id: z.string(),
    video_id: z.string(),
    parent_comment_id: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    status: z.string().optional(),
    create_time: z.number().optional(),
    likes: z.number().optional(),
    liked: z.boolean().optional(),
    replies: z.number().optional(),
    owner: z.boolean().optional(),
    pinned: z.boolean().optional(),
    unique_identifier: z.string().optional(),
    user_id: z.string().optional(),
    username: z.string().optional(),
    display_name: z.string().optional(),
    profile_image: z.string().optional(),
  }),
});

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
export type TikTokCommentUpdateEventType = z.infer<
  typeof TikTokCommentUpdateBase
>;
export type TikTokBusinessCommentPayloadType = z.infer<
  typeof TikTokBusinessCommentPayload
>;

// MessagePayload now includes FB comments as well for unified storage
export const MessagePayload = z.union([
  FBMessagePayload,
  IGMessagePayload,
  FBCommentPayload,
  IGCommentPayload,
  IGMessageEditPayload,
  IGMessageReactionPayload,
  TikTokBusinessCommentPayload,
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
  type: z.enum([
    "image",
    "video",
    "audio",
    "file",
    "reel",
    "ig_reel",
    "share",
    "story_mention",
  ]),
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

export const InboxCollabAssigneeSchema = z.object({
  userId: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional(),
  assignedAt: z.coerce.date(),
});
export type InboxCollabAssignee = z.infer<typeof InboxCollabAssigneeSchema>;

export const InboxCollabLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  appliedAt: z.coerce.date(),
});
export type InboxCollabLabel = z.infer<typeof InboxCollabLabelSchema>;

export const InboxCollabStatusSchema = z.object({
  key: z.string(),
  label: z.string(),
  updatedAt: z.coerce.date(),
});
export type InboxCollabStatus = z.infer<typeof InboxCollabStatusSchema>;

export const InboxCollabNoteSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  text: z.string(),
  createdAt: z.coerce.date(),
});
export type InboxCollabNote = z.infer<typeof InboxCollabNoteSchema>;

export const InboxCollabReminderSchema = z.object({
  remindAt: z.coerce.date(),
  createdBy: z.string(),
});
export type InboxCollabReminder = z.infer<typeof InboxCollabReminderSchema>;

export const InboxCollabContactSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    orderStatus: z.string().optional(),
  })
  .partial();
export type InboxCollabContact = z.infer<typeof InboxCollabContactSchema>;

export const InboxConversationCollabSchema = z
  .object({
    assignee: InboxCollabAssigneeSchema.optional(),
    labels: z.array(InboxCollabLabelSchema).optional(),
    priority: z.enum(["priority", "normal", "low"]).optional(),
    status: InboxCollabStatusSchema.optional(),
    notes: z.array(InboxCollabNoteSchema).optional(),
    reminder: InboxCollabReminderSchema.optional(),
    contact: InboxCollabContactSchema.optional(),
  })
  .partial();
export type InboxConversationCollab = z.infer<
  typeof InboxConversationCollabSchema
>;

export const InboxConnectedAccountSummary = z.object({
  id: z.string(),
  accountName: z.string().nullable(),
  profilePicUrl: z.string().nullable().optional(),
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
  // Unread status
  isUnread: z.boolean(),
  lastReadAt: z.coerce.date().nullable(),
  collab: InboxConversationCollabSchema.optional(),
  notesCount: z.number().optional(),
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
  platform: AllPlatformsZod,
  contact: InboxContactSchema,
  isUnread: z.boolean().optional(),
  lastReadAt: z.coerce.date().nullable().optional(),
  collab: InboxConversationCollabSchema.optional(),
  notesCount: z.number().optional(),
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
